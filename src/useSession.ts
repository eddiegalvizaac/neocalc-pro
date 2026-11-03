import { useCallback, useEffect, useRef, useState } from "react";
import { demo, type State } from "./model";
import {
  assertPassword,
  assertCredential,
  ConflictError,
  decodeBackup,
  readVault,
  seal,
  unseal,
  writeVault,
} from "./storage";
import { validateState } from "./validation";
export const INACTIVITY_MS = 300000;
const empty = (): State => ({ patients: [], audit: [] });
export function useSession(notify: (message: string) => void) {
  const [state, setState] = useState<State>(demo),
    [ready, setReady] = useState(false),
    [locked, setLocked] = useState(false),
    [secure, setSecure] = useState(false),
    [busy, setBusy] = useState(false);
  const current = useRef(state),
    secret = useRef(""),
    revision = useRef(0),
    epoch = useRef(0),
    isLocked = useRef(false),
    isSecure = useRef(false),
    working = useRef(false),
    initialized = useRef(false),
    deadline = useRef(0);
  const publish = (s: State) => {
    current.current = s;
    setState(s);
  };
  const lock = useCallback(() => {
    epoch.current++;
    secret.current = "";
    isLocked.current = true;
    current.current = empty();
    setState(current.current);
    setLocked(true);
  }, []);
  useEffect(() => {
    let alive = true;
    readVault()
      .then((e) => {
        if (!alive) return;
        if (e) {
          isSecure.current = true;
          setSecure(true);
          lock();
        } else {
          isLocked.current = false;
          setLocked(false);
        }
      })
      .catch(() => {
        if (alive)
          notify(
            "Não foi possível verificar o armazenamento. Demonstração volátil; não grave dados reais.",
          );
      })
      .finally(() => {
        if (alive) {
          initialized.current = true;
          setReady(true);
        }
      });
    return () => {
      alive = false;
      epoch.current++;
      secret.current = "";
      isLocked.current = true;
    };
  }, [lock, notify]);
  function assertOpen() {
    if (!initialized.current || isLocked.current)
      throw Error("Sessão bloqueada ou ainda não inicializada.");
    if (
      isSecure.current &&
      deadline.current &&
      Date.now() >= deadline.current
    ) {
      lock();
      throw Error("Sessão bloqueada por inatividade. Desbloqueie novamente.");
    }
  }
  function assertEpoch(value: number) {
    if (value !== epoch.current || isLocked.current)
      throw Error(
        "A sessão foi bloqueada durante a operação. Desbloqueie para conferir os registros.",
      );
    assertOpen();
  }
  function begin() {
    if (working.current)
      throw Error("Aguarde a operação atual antes de continuar.");
    working.current = true;
    setBusy(true);
  }
  function finish() {
    working.current = false;
    setBusy(false);
  }
  async function commit(change: (s: State) => State, text: string) {
    assertOpen();
    begin();
    const token = epoch.current;
    try {
      const next = change(current.current),
        s = validateState({
          ...next,
          audit: [...next.audit, { time: new Date().toISOString(), text }],
        });
      if (isSecure.current) {
        const encrypted = await seal(s, secret.current);
        assertEpoch(token);
        revision.current = await writeVault(encrypted, revision.current);
        assertEpoch(token);
      }
      publish(s);
      notify(
        isSecure.current
          ? "Registrado no cofre local criptografado."
          : "Salvo nesta sessão de demonstração.",
      );
    } catch (e) {
      if (e instanceof ConflictError) lock();
      throw e;
    } finally {
      finish();
    }
  }
  async function unlock(password: string) {
    assertCredential(password);
    begin();
    const token = epoch.current;
    try {
      const existing = await readVault();
      let s: State, newRevision: number;
      if (existing) {
        s = await unseal(existing, password);
        newRevision = existing.revision ?? 0;
      } else {
        if (isSecure.current || isLocked.current)
          throw Error(
            "Cofre não encontrado. O navegador pode ter removido os dados. Não foi criado um cofre vazio; restaure um backup na demonstração.",
          );
        assertPassword(password);
        s = validateState(current.current);
        newRevision = await writeVault(await seal(s, password), 0);
      }
      if (token !== epoch.current)
        throw Error("A sessão mudou durante o desbloqueio. Tente novamente.");
      secret.current = password;
      revision.current = newRevision;
      isSecure.current = true;
      isLocked.current = false;
      deadline.current = Date.now() + INACTIVITY_MS;
      publish(s);
      setSecure(true);
      setLocked(false);
      notify("Cofre desbloqueado. Bloqueio após 5 minutos de inatividade.");
    } catch (e) {
      if (e instanceof ConflictError) lock();
      throw e;
    } finally {
      finish();
    }
  }
  async function encryptedBackup() {
    assertOpen();
    if (!isSecure.current)
      throw Error("Configure e desbloqueie o cofre para exportar.");
    const token = epoch.current;
    const e = await seal(current.current, secret.current);
    assertEpoch(token);
    assertOpen();
    return e;
  }
  async function importBackup(text: string, confirmReplace: () => boolean) {
    assertOpen();
    if (!isSecure.current) throw Error("Abra o cofre antes de importar.");
    const token = epoch.current;
    const incoming = await decodeBackup(text, secret.current);
    assertEpoch(token);
    assertOpen();
    if (!confirmReplace()) return false;
    await commit(() => incoming, "Backup importado por confirmação do usuário");
    return true;
  }
  function startDemo() {
    if (working.current) {
      notify("Aguarde a operação atual.");
      return;
    }
    epoch.current++;
    secret.current = "";
    isSecure.current = false;
    isLocked.current = false;
    revision.current = 0;
    deadline.current = 0;
    publish(demo());
    setSecure(false);
    setLocked(false);
    notify("Demonstração fictícia aberta. O cofre existente não foi alterado.");
  }
  useEffect(() => {
    if (!secure || locked) return;
    deadline.current = Date.now() + INACTIVITY_MS;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(check, Math.max(0, deadline.current - Date.now()));
    };
    function check() {
      if (Date.now() >= deadline.current) lock();
      else schedule();
    }
    const activity = () => {
      if (Date.now() >= deadline.current) {
        lock();
        return;
      }
      deadline.current = Date.now() + INACTIVITY_MS;
      schedule();
    };
    schedule();
    window.addEventListener("pointerdown", activity, true);
    window.addEventListener("keydown", activity, true);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", activity, true);
      window.removeEventListener("keydown", activity, true);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [secure, locked, lock]);
  return {
    state,
    ready,
    locked,
    secure,
    busy,
    commit,
    unlock,
    lock,
    encryptedBackup,
    importBackup,
    startDemo,
    assertOpen,
  };
}
