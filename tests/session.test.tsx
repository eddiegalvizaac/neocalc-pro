import { test, expect, vi } from "vitest";
import { renderHook, act, waitFor, fireEvent } from "@testing-library/react";
import { useSession, INACTIVITY_MS } from "../src/useSession";
import * as storage from "../src/storage";
import { demo, type State } from "../src/model";
const pass = "senha-ficticia-auditoria-123";
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { resolve, promise };
}
async function setup() {
  const notify = vi.fn(),
    view = renderHook(() => useSession(notify));
  await waitFor(() => expect(view.result.current.ready).toBe(true));
  return { ...view, notify };
}
const change = (s: State) => ({
  ...s,
  patients: s.patients.map((p, i) => (i === 0 ? { ...p, weight: 1500 } : p)),
});
test("bloqueio durante cifragem impede gravação e reapresentação tardia dos dados", async () => {
  const { result } = await setup();
  await act(async () => {
    await result.current.unlock(pass);
  });
  const e = await storage.seal(demo(), pass),
    gate = deferred<typeof e>();
  vi.spyOn(storage, "seal").mockImplementationOnce(() => gate.promise);
  let pending!: Promise<unknown>;
  act(() => {
    pending = result.current
      .commit(change, "RN-001: alteração fictícia")
      .catch((e) => e);
  });
  act(() => result.current.lock());
  gate.resolve(e);
  await act(async () => expect(await pending).toBeInstanceOf(Error));
  expect(result.current.locked).toBe(true);
  expect(result.current.state.patients).toHaveLength(0);
  expect((await storage.readVault())?.revision).toBe(1);
});
test("bloqueio durante transação impede estado visível; gravação já iniciada pode ser conferida ao reabrir", async () => {
  const { result } = await setup();
  await act(async () => {
    await result.current.unlock(pass);
  });
  const realWrite = storage.writeVault,
    gate = deferred<void>(),
    started = deferred<void>();
  vi.spyOn(storage, "writeVault").mockImplementationOnce(async (e, rev) => {
    const revision = await realWrite(e, rev);
    started.resolve();
    await gate.promise;
    return revision;
  });
  let pending!: Promise<unknown>;
  act(() => {
    pending = result.current
      .commit(change, "RN-001: ajuste fictício")
      .catch((e) => e);
  });
  await act(async () => {
    await started.promise;
  });
  act(() => result.current.lock());
  gate.resolve();
  await act(async () => expect(await pending).toBeInstanceOf(Error));
  expect(result.current.state.patients).toHaveLength(0);
  await act(async () => {
    await result.current.unlock(pass);
  });
  expect(result.current.state.patients[0].weight).toBe(1500);
});
test("segunda gravação simultânea é recusada sem perder a primeira", async () => {
  const { result } = await setup();
  await act(async () => {
    await result.current.unlock(pass);
  });
  const realSeal = storage.seal,
    gate = deferred<void>();
  vi.spyOn(storage, "seal").mockImplementationOnce(async (s, p) => {
    await gate.promise;
    return realSeal(s, p);
  });
  let first!: Promise<void>;
  act(() => {
    first = result.current.commit(change, "RN-001: primeira");
  });
  await act(async () => {
    await expect(result.current.commit((s) => s, "segunda")).rejects.toThrow(
      "Aguarde",
    );
  });
  gate.resolve();
  await act(async () => {
    await first;
  });
  expect(result.current.state.patients[0].weight).toBe(1500);
  expect(result.current.state.audit.at(-1)?.text).toBe("RN-001: primeira");
});
test("exportação em andamento não entrega conteúdo após bloqueio", async () => {
  const { result } = await setup();
  await act(async () => {
    await result.current.unlock(pass);
  });
  const e = await storage.seal(demo(), pass),
    gate = deferred<typeof e>();
  vi.spyOn(storage, "seal").mockImplementationOnce(() => gate.promise);
  const pending = result.current.encryptedBackup().catch((e) => e);
  act(() => result.current.lock());
  gate.resolve(e);
  expect(await pending).toBeInstanceOf(Error);
  expect(result.current.state.patients).toHaveLength(0);
});
test("conflito com outra aba bloqueia a sessão e não sobrescreve o estado atual do banco", async () => {
  const { result } = await setup();
  await act(async () => {
    await result.current.unlock(pass);
  });
  await storage.writeVault(
    await storage.seal({ patients: [], audit: [] }, pass),
    1,
  );
  await act(async () => {
    await expect(result.current.commit(change, "teste")).rejects.toBeInstanceOf(
      storage.ConflictError,
    );
  });
  expect(result.current.locked).toBe(true);
  expect(result.current.state.patients).toHaveLength(0);
  expect(
    (await storage.unseal((await storage.readVault())!, pass)).patients,
  ).toHaveLength(0);
});
test("falha de gravação não altera a sessão e libera uma nova tentativa", async () => {
  const { result } = await setup();
  await act(async () => {
    await result.current.unlock(pass);
  });
  vi.spyOn(storage, "writeVault").mockRejectedValueOnce(
    new DOMException("Quota fictícia", "QuotaExceededError"),
  );
  const before = result.current.state;
  await act(async () => {
    await expect(result.current.commit(change, "falha")).rejects.toThrow(
      "Quota fictícia",
    );
  });
  expect(result.current.state).toBe(before);
  expect(result.current.busy).toBe(false);
  await act(async () => {
    await result.current.commit(change, "nova tentativa");
  });
  expect(result.current.state.patients[0].weight).toBe(1500);
});
test("cofre removido durante bloqueio não é substituído silenciosamente por um cofre vazio", async () => {
  const { result } = await setup();
  await act(async () => {
    await result.current.unlock(pass);
  });
  act(() => result.current.lock());
  vi.spyOn(storage, "readVault").mockResolvedValueOnce(undefined);
  const write = vi.spyOn(storage, "writeVault");
  await act(async () => {
    await expect(result.current.unlock(pass)).rejects.toThrow(
      "Cofre não encontrado",
    );
  });
  expect(write).not.toHaveBeenCalled();
  expect(result.current.locked).toBe(true);
  act(() => result.current.startDemo());
  expect(result.current.secure).toBe(false);
  expect(result.current.state.patients).toHaveLength(3);
  expect((await storage.readVault())?.revision).toBe(1);
});
test("inatividade: atividade reinicia prazo e cinco minutos bloqueiam o cofre", async () => {
  const { result } = await setup();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  await act(async () => {
    await result.current.unlock(pass);
  });
  act(() => vi.advanceTimersByTime(INACTIVITY_MS - 1));
  expect(result.current.locked).toBe(false);
  fireEvent.pointerDown(window);
  act(() => vi.advanceTimersByTime(INACTIVITY_MS - 1));
  expect(result.current.locked).toBe(false);
  act(() => vi.advanceTimersByTime(1));
  expect(result.current.locked).toBe(true);
  expect(result.current.state.patients).toHaveLength(0);
});
test("retorno do segundo plano após suspensão verifica o prazo sem reativá-lo primeiro", async () => {
  const { result } = await setup();
  await act(async () => {
    await result.current.unlock(pass);
  });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.now() + INACTIVITY_MS + 1);
  fireEvent.focus(window);
  expect(result.current.locked).toBe(true);
});
test("backup inválido/cancelado não substitui registros; importação é invalidada por bloqueio", async () => {
  const { result } = await setup();
  await act(async () => {
    await result.current.unlock(pass);
  });
  const replacement = { patients: [], audit: [] },
    text = JSON.stringify(await storage.seal(replacement, pass));
  const no = vi.fn(() => false);
  await act(async () => {
    expect(await result.current.importBackup(text, no)).toBe(false);
  });
  expect(result.current.state.patients).toHaveLength(3);
  expect((await storage.readVault())?.revision).toBe(1);
  await expect(result.current.importBackup("{}", () => true)).rejects.toThrow();
  const gate = deferred<State>();
  vi.spyOn(storage, "decodeBackup").mockImplementationOnce(() => gate.promise);
  const confirm = vi.fn(() => true),
    pending = result.current.importBackup(text, confirm).catch((e) => e);
  act(() => result.current.lock());
  gate.resolve(replacement);
  expect(await pending).toBeInstanceOf(Error);
  expect(confirm).not.toHaveBeenCalled();
  expect((await storage.readVault())?.revision).toBe(1);
});

test("política de nova senha não impede abertura de cofre legado com senha antiga", async () => {
  const { result } = await setup();
  await act(async () => {
    await expect(result.current.unlock("            ")).rejects.toThrow(
      "senha forte",
    );
  });
  expect(await storage.readVault()).toBeUndefined();
  await storage.writeVault(await storage.seal(demo(), "            "));
  await act(async () => {
    await result.current.unlock("            ");
  });
  expect(result.current.state.patients).toHaveLength(3);
  await act(async () => {
    await result.current.commit(change, "RN-001: legado fictício");
  });
  expect(result.current.state.patients[0].weight).toBe(1500);
});
