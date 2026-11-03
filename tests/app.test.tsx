import React from "react";
import { test, expect, vi } from "vitest";
import {
  render,
  screen,
  within,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import { demo } from "../src/model";
import { readVault, writeVault, seal, unseal } from "../src/storage";
const pass = "senha-ficticia-auditoria-123";
async function boot() {
  const view = render(<App />);
  await screen.findByRole("button", { name: "Novo paciente" });
  return view;
}
function nav(name: string) {
  fireEvent.click(
    within(document.querySelector("nav")!).getByRole("button", {
      name: new RegExp("^" + name),
    }),
  );
}
function field(root: HTMLElement, label: string, value: string) {
  fireEvent.change(within(root).getByLabelText(label, { exact: false }), {
    target: { value },
  });
}
function save(root: HTMLElement) {
  fireEvent.click(
    within(root).getByRole("button", { name: "Salvar registro" }),
  );
}
async function closed() {
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}
async function createVault() {
  nav("Configurações");
  fireEvent.click(
    screen.getByRole("button", { name: "Configurar / abrir cofre" }),
  );
  const d = screen.getByRole("dialog");
  field(d, "Senha do cofre", pass);
  fireEvent.click(
    within(d).getByRole("button", { name: "Configurar / desbloquear" }),
  );
  await closed();
}
async function unlock() {
  await screen.findByRole("heading", { name: "Cofre bloqueado" });
  fireEvent.change(screen.getByLabelText("Senha do cofre"), {
    target: { value: pass },
  });
  fireEvent.click(screen.getByRole("button", { name: "Desbloquear" }));
  await screen.findByRole("button", { name: "Novo paciente" });
}
async function newPatient(id = "RN-900") {
  fireEvent.click(screen.getByRole("button", { name: "Novo paciente" }));
  const d = screen.getByRole("dialog");
  for (const [k, v] of Object.entries({
    "Identificador pseudônimo": id,
    "Nascimento (hora local)": "2026-01-01T08:00",
    "IG (semanas)": "30",
    "IG (dias adicionais)": "2",
    "Peso ao nascer (g)": "1300",
    "Peso atual (g)": "1400",
  }))
    field(d, k, v);
  save(d);
  await closed();
}

test("todos os nove menus, marca, perfil e atalhos de navegação têm destino funcional", async () => {
  await boot();
  for (const name of [
    "Pacientes",
    "Gasometrias",
    "Ventilação",
    "Calculadoras",
    "Medicações",
    "Hidratação e Nutrição",
    "Histórico",
    "Configurações",
  ]) {
    nav(name);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(name);
  }
  fireEvent.click(
    screen.getByRole("button", { name: "NeoCalc Pro — visão geral" }),
  );
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "Uma visão completa do cuidado.",
  );
  for (const [name, destination] of [
    ["Ver registros", "Gasometrias"],
    ["Ver todas", "Gasometrias"],
    ["Ver histórico", "Histórico"],
    ["Explorar calculadoras", "Calculadoras"],
    ["Saiba mais", "Configurações"],
  ]) {
    fireEvent.click(screen.getByRole("button", { name }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      destination,
    );
    nav("Visão geral");
  }
  fireEvent.click(
    screen.getByRole("button", { name: /Profissional de saúde/ }),
  );
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "Configurações",
  );
});
test("menu móvel abre/fecha e seleciona seção; sem alegar teste de dispositivo", async () => {
  await boot();
  const menu = screen.getByRole("button", { name: "Abrir menu" });
  fireEvent.click(menu);
  expect(menu.getAttribute("aria-expanded")).toBe("true");
  expect(document.querySelector("aside")?.className).toContain("open");
  nav("Gasometrias");
  expect(menu.getAttribute("aria-expanded")).toBe("false");
});
test("fluxo paciente fictício: criar, editar peso/diagnóstico, pesquisar, arquivar, reativar e excluir", async () => {
  await boot();
  await newPatient();
  nav("Visão geral");
  expect(
    (screen.getByLabelText("Paciente ativo") as HTMLSelectElement).value,
  ).toBe("RN-900");
  fireEvent.click(screen.getByRole("button", { name: "Ver paciente" }));
  const d = screen.getByRole("dialog");
  field(d, "Peso atual (g)", "1450");
  field(d, "Diagnóstico principal", "Observação neonatal");
  field(d, "Observações", "Edição fictícia de auditoria");
  save(d);
  await closed();
  expect(document.querySelector(".stats")?.textContent).toContain("1.450");
  nav("Pacientes");
  fireEvent.change(
    screen.getByPlaceholderText("Buscar código ou diagnóstico"),
    { target: { value: "RN-900" } },
  );
  expect(document.querySelectorAll(".patient-card")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Encerrar e arquivar" }));
  await waitFor(() =>
    expect(document.querySelectorAll(".patient-card")).toHaveLength(0),
  );
  fireEvent.click(screen.getByRole("button", { name: "Ver arquivados" }));
  fireEvent.click(screen.getByRole("button", { name: "Reativar" }));
  await waitFor(() =>
    expect(document.querySelectorAll(".patient-card")).toHaveLength(0),
  );
  fireEvent.click(screen.getByRole("button", { name: "Ver ativos" }));
  fireEvent.click(screen.getByRole("button", { name: "Abrir acompanhamento" }));
  nav("Pacientes");
  fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
  const del = screen.getByRole("dialog");
  field(del, "Código do paciente", "RN-999");
  fireEvent.click(
    within(del).getByRole("button", { name: "Excluir do cofre" }),
  );
  expect(await screen.findByText("Código incorreto.")).toBeTruthy();
  field(del, "Código do paciente", "RN-900");
  fireEvent.click(
    within(del).getByRole("button", { name: "Excluir do cofre" }),
  );
  await closed();
  expect(document.querySelectorAll(".patient-card")).toHaveLength(0);
});
test("pacientes persistem cifrados e reabertura exige senha; nenhuma gravação no localStorage", async () => {
  const writeSpy = vi.spyOn(Storage.prototype, "setItem");
  const view = await boot();
  await createVault();
  await newPatient();
  const e = await readVault();
  expect(e).toBeDefined();
  expect(JSON.stringify(e)).not.toContain("RN-900");
  expect(JSON.stringify(e)).not.toContain(pass);
  view.unmount();
  render(<App />);
  await screen.findByRole("heading", { name: "Cofre bloqueado" });
  expect(screen.queryByText("RN-900")).toBeNull();
  fireEvent.change(screen.getByLabelText("Senha do cofre"), {
    target: { value: "senha-errada-123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Desbloquear" }));
  await screen.findByText(/Não foi possível abrir o cofre/);
  expect(screen.queryByRole("button", { name: "Novo paciente" })).toBeNull();
  await unlock();
  expect(
    [...screen.getByLabelText("Paciente ativo").querySelectorAll("option")].map(
      (o) => o.textContent,
    ),
  ).toContain("RN-900");
  expect(writeSpy).not.toHaveBeenCalled();
}, 10000);
test("exclusão persistida e exclusão do último paciente deixam estado vazio utilizável", async () => {
  const single = demo();
  single.patients = [single.patients[0]];
  await writeVault(await seal(single, pass));
  render(<App />);
  await unlock();
  nav("Pacientes");
  fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
  const d = screen.getByRole("dialog");
  field(d, "Código do paciente", "RN-001");
  fireEvent.click(within(d).getByRole("button", { name: "Excluir do cofre" }));
  await closed();
  expect((await unseal((await readVault())!, pass)).patients).toHaveLength(0);
  for (const section of [
    "Visão geral",
    "Gasometrias",
    "Ventilação",
    "Histórico",
  ]) {
    nav(section);
    expect(screen.getByText("Comece um acompanhamento")).toBeTruthy();
  }
  await newPatient("RN-901");
  nav("Visão geral");
  expect(
    (screen.getByLabelText("Paciente ativo") as HTMLSelectElement).value,
  ).toBe("RN-901");
}, 10000);
test("gasometrias seriadas: salvar, ordenar, comparar e refletir o paciente ativo", async () => {
  await boot();
  await newPatient();
  nav("Gasometrias");
  for (const [date, ph, co2] of [
    ["2026-01-03T09:00", "7.35", "40"],
    ["2026-01-02T09:00", "7.25", "55"],
  ]) {
    fireEvent.click(screen.getByRole("button", { name: "Nova gasometria" }));
    const d = screen.getByRole("dialog");
    for (const [k, v] of Object.entries({
      "Data e hora (local)": date,
      "pH medido": ph,
      "PCO₂ medida (mmHg)": co2,
      "HCO₃⁻ calculado (mmol/L)": "22",
    }))
      field(d, k, v);
    save(d);
    await closed();
  }
  expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  screen.getAllByRole("checkbox").forEach((c) => fireEvent.click(c));
  expect(document.querySelector(".comparison")?.textContent).toContain(
    "Δ 0.10",
  );
  expect(document.querySelector(".comparison")?.textContent).toContain(
    "PCO₂ Δ -15.0 mmHg",
  );
  expect(document.querySelectorAll(".chart circle")).toHaveLength(2);
  fireEvent.change(screen.getByLabelText("Paciente ativo"), {
    target: { value: "RN-002" },
  });
  expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  expect(screen.queryByText("Comparação cronológica")).toBeNull();
  expect(screen.getByText("Nenhuma gasometria registrada.")).toBeTruthy();
});
test("ventilação: parâmetros gravados e associados por cópia ao gás contemporâneo", async () => {
  await boot();
  await newPatient();
  nav("Ventilação");
  for (const [time, fio2] of [
    ["2026-01-02T08:00", "30"],
    ["2026-01-02T10:00", "40"],
  ]) {
    fireEvent.click(screen.getByRole("button", { name: "Registrar ajuste" }));
    const d = screen.getByRole("dialog");
    for (const [k, v] of Object.entries({
      "Data e hora (local)": time,
      Modalidade: "SIMV",
      "FiO₂ (%)": fio2,
      "PEEP (cmH₂O)": "5",
      "MAP de vias aéreas (cmH₂O)": "8",
      "Motivo do ajuste": "Teste fictício",
    }))
      field(d, k, v);
    save(d);
    await closed();
  }
  expect(document.querySelector("table")?.textContent).toContain("Δ 10");
  nav("Gasometrias");
  fireEvent.click(screen.getByRole("button", { name: "Nova gasometria" }));
  const d = screen.getByRole("dialog");
  for (const [k, v] of Object.entries({
    "Data e hora (local)": "2026-01-02T09:00",
    "pH medido": "7.3",
    "PCO₂ medida (mmHg)": "45",
    "HCO₃⁻ calculado (mmol/L)": "23",
  }))
    field(d, k, v);
  save(d);
  await closed();
  nav("Ventilação");
  expect(
    screen.getByText(/pH 7.3 · SIMV, FiO₂ 30%, PEEP 5 cmH₂O/),
  ).toBeTruthy();
  nav("Visão geral");
  expect(document.querySelector(".stats")?.textContent).toContain("FiO₂ 40%");
});
test("todos os botões das calculadoras abrem o formulário correto; fórmulas e resultados correspondem", async () => {
  await boot();
  for (const [name, label] of [
    ["Idade e crescimento", "IG ao nascer (semanas)"],
    ["TIG", "Glicose (%)"],
    ["Índice de oxigenação", "PaO₂ arterial (mmHg)"],
  ]) {
    fireEvent.click(
      screen.getByRole("button", { name: new RegExp("^" + name) }),
    );
    expect(
      within(screen.getByRole("dialog")).getByLabelText(label),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
  }
  fireEvent.click(screen.getByRole("button", { name: /Abrir calculadoras/ }));
  let d = screen.getByRole("dialog");
  field(d, "Peso (kg)", "1");
  field(d, "Glicose (%)", "10");
  field(d, "Infusão (mL/h)", "3");
  fireEvent.click(within(d).getByRole("button", { name: "Calcular" }));
  expect(within(d).getByRole("status").textContent).toBe("5.000 mg/kg/min");
  field(d, "Infusão (mL/h)", "6");
  expect(within(d).queryByRole("status")).toBeNull();
  fireEvent.click(within(d).getByRole("button", { name: "Calcular" }));
  expect(within(d).getByRole("status").textContent).toBe("10.000 mg/kg/min");
  fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
  nav("Calculadoras");
  fireEvent.click(screen.getByRole("button", { name: /^Idade e crescimento/ }));
  d = screen.getByRole("dialog");
  field(d, "IG ao nascer (semanas)", "32");
  field(d, "Dias adicionais da IG", "0");
  field(d, "Data e hora do nascimento", "2026-01-01T08:00");
  field(d, "Data e hora da avaliação", "2026-02-26T08:00");
  fireEvent.click(within(d).getByRole("button", { name: "Calcular" }));
  expect(within(d).getByRole("status").textContent).toContain(
    "IPM: 40s 0d · Idade corrigida: 0s 0d",
  );
  fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
  fireEvent.click(screen.getByRole("button", { name: /^Volume e infusão/ }));
  d = screen.getByRole("dialog");
  field(d, "Volume prescrito (mL)", "120");
  field(d, "Duração (horas)", "24");
  fireEvent.click(within(d).getByRole("button", { name: "Calcular" }));
  expect(within(d).getByRole("status").textContent).toBe("5.00 mL/h");
});
test("rascunho é mantido ao cancelar/fechar e isolado por paciente; foco, Escape e retorno por teclado", async () => {
  await boot();
  const user = userEvent.setup();
  const trigger = screen.getByRole("button", { name: /Registrar gasometria/ });
  await user.click(trigger);
  let d = screen.getByRole("dialog");
  field(d, "pH medido", "7.31");
  expect(document.activeElement?.tagName).toBe("INPUT");
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(trigger);
  await user.click(trigger);
  d = screen.getByRole("dialog");
  expect(
    (within(d).getByLabelText("pH medido") as HTMLInputElement).value,
  ).toBe("7.31");
  fireEvent.click(within(d).getByRole("button", { name: "Cancelar" }));
  fireEvent.change(screen.getByLabelText("Paciente ativo"), {
    target: { value: "RN-002" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Registrar gasometria/ }));
  expect(
    (
      within(screen.getByRole("dialog")).getByLabelText(
        "pH medido",
      ) as HTMLInputElement
    ).value,
  ).toBe("");
});
test("exportar sem cofre é bloqueado; persistência ausente/rejeitada tem retorno controlado", async () => {
  await boot();
  nav("Configurações");
  fireEvent.click(
    screen.getByRole("button", { name: "Exportar backup protegido" }),
  );
  await screen.findByText("Configure e desbloqueie o cofre para exportar.");
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Solicitar persistência ao navegador" }),
  );
  await screen.findByText("Persistência concedida pelo navegador.");
  Object.defineProperty(navigator, "storage", {
    configurable: true,
    value: {},
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Solicitar persistência ao navegador" }),
  );
  await screen.findByText(
    "Persistência indisponível ou não concedida. Mantenha backups.",
  );
  Object.defineProperty(navigator, "storage", {
    configurable: true,
    value: {
      persist: vi.fn(async () => {
        throw Error("simulado");
      }),
    },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Solicitar persistência ao navegador" }),
  );
  await screen.findByText(
    "Não foi possível solicitar persistência. Mantenha backups.",
  );
});
test("cofre, backup protegido, importação confirmada e bloqueio manual funcionam com dados fictícios", async () => {
  await boot();
  await createVault();
  fireEvent.click(
    screen.getByRole("button", { name: "Exportar backup protegido" }),
  );
  await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
  expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  const imported = demo();
  imported.patients = [{ ...imported.patients[0], id: "RN-888" }];
  const file = new File(
    [JSON.stringify(await seal(imported, pass))],
    "backup.json",
    { type: "application/json" },
  );
  Object.defineProperty(file, "text", {
    value: async () => JSON.stringify(await seal(imported, pass)),
  });
  fireEvent.change(screen.getByLabelText("Importar backup"), {
    target: { files: [file] },
  });
  await screen.findByText("Registrado no cofre local criptografado.");
  expect(confirm).toHaveBeenCalled();
  expect((await unseal((await readVault())!, pass)).patients[0].id).toBe(
    "RN-888",
  );
  fireEvent.click(screen.getByRole("button", { name: "Bloquear agora" }));
  await screen.findByRole("heading", { name: "Cofre bloqueado" });
  expect(document.querySelector("main")).toBeNull();
  await unlock();
  nav("Visão geral");
  expect(
    (screen.getByLabelText("Paciente ativo") as HTMLSelectElement).value,
  ).toBe("RN-888");
}, 15000);
test("etiquetas online/offline não afirmam instalação; medicações bloqueadas e atalhos de retorno funcionam", async () => {
  await boot();
  fireEvent(window, new Event("offline"));
  expect(screen.queryByText("Disponível offline")).toBeNull();
  nav("Configurações");
  expect(
    screen.getByText(/Instalação e funcionamento offline não verificados/),
  ).toBeTruthy();
  nav("Medicações");
  expect(screen.getByText("Aguardando validação farmacológica")).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: /Acessar calculadoras disponíveis/ }),
  );
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "Calculadoras",
  );
  nav("Hidratação e Nutrição");
  expect(
    screen.getAllByRole("button", { name: /Ver fórmula, unidades e limites/ }),
  ).toHaveLength(4);
  fireEvent(window, new Event("neocalc-sw-error"));
  await screen.findByText(
    "Service worker indisponível. Instalação e offline não confirmados.",
  );
  fireEvent.click(screen.getByRole("button", { name: "Dispensar" }));
  expect(screen.queryByRole("status")).toBeNull();
});

test("ícone de segurança e formulários de ação rápida abrem, fecham e mantêm o contexto", async () => {
  await boot();
  fireEvent.click(screen.getByRole("button", { name: "Segurança local" }));
  expect(screen.getByRole("dialog").textContent).toContain(
    "Proteja seus registros",
  );
  fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
  for (const name of ["Registrar ventilação", "Registrar gasometria"]) {
    fireEvent.click(
      screen.getByRole("button", { name: new RegExp("^" + name) }),
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Cancelar",
      }),
    );
  }
  for (const name of ["pH", "PCO₂", "HCO₃⁻", "BE", "Lactato"]) {
    fireEvent.click(screen.getByRole("button", { name }));
    expect(document.querySelector(".chart-tabs .selected")?.textContent).toBe(
      name,
    );
  }
  fireEvent.click(screen.getByRole("button", { name: "Ver paciente" }));
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Cancelar",
    }),
  );
  const menu = screen.getByRole("button", { name: "Abrir menu" });
  fireEvent.click(menu);
  fireEvent.click(menu);
  expect(menu.getAttribute("aria-expanded")).toBe("false");
});
test("IO na interface usa PaO₂ arterial e remove resultado ao trocar amostra", async () => {
  await boot();
  nav("Calculadoras");
  fireEvent.click(
    screen.getByRole("button", { name: /^Índice de oxigenação/ }),
  );
  const d = screen.getByRole("dialog");
  for (const [k, v] of Object.entries({
    "FiO₂ (%)": "40",
    "MAP de vias aéreas (cmH₂O)": "10",
    "PaO₂ arterial (mmHg)": "80",
  }))
    field(d, k, v);
  fireEvent.click(within(d).getByRole("button", { name: "Calcular" }));
  expect(within(d).getByRole("status").textContent).toBe("IO = 5.00");
  field(d, "Amostra", "Venosa");
  expect(within(d).queryByRole("status")).toBeNull();
  fireEvent.click(within(d).getByRole("button", { name: "Calcular" }));
  await screen.findByText("O IO exige PaO₂ de amostra arterial.");
  expect(within(d).queryByRole("status")).toBeNull();
});
test("falha ao salvar mantém formulário e valores para nova tentativa", async () => {
  const storage = await import("../src/storage");
  await boot();
  await createVault();
  nav("Visão geral");
  fireEvent.click(screen.getByRole("button", { name: "Ver paciente" }));
  const d = screen.getByRole("dialog");
  field(d, "Peso atual (g)", "1500");
  vi.spyOn(storage, "writeVault").mockRejectedValueOnce(
    new DOMException("Quota fictícia", "QuotaExceededError"),
  );
  save(d);
  await screen.findByText("Quota fictícia");
  expect(screen.getByRole("dialog")).toBe(d);
  expect(
    (within(d).getByLabelText("Peso atual (g)") as HTMLInputElement).value,
  ).toBe("1500");
  save(d);
  await closed();
  expect(document.querySelector(".stats")?.textContent).toContain("1.500");
}, 10000);
test("importação cancelada ou malformada não altera registros nem grava em texto puro", async () => {
  await boot();
  await createVault();
  const original = await readVault();
  const empty = JSON.stringify(await seal({ patients: [], audit: [] }, pass));
  const file = new File([empty], "simulado.json");
  Object.defineProperty(file, "text", { value: async () => empty });
  vi.mocked(confirm).mockReturnValueOnce(false);
  fireEvent.change(screen.getByLabelText("Importar backup"), {
    target: { files: [file] },
  });
  await waitFor(() => expect(confirm).toHaveBeenCalled());
  expect(await readVault()).toEqual(original);
  const invalid = new File(["{}"], "inválido.json");
  Object.defineProperty(invalid, "text", { value: async () => "{}" });
  fireEvent.change(screen.getByLabelText("Importar backup"), {
    target: { files: [invalid] },
  });
  await screen.findByText(/Importação não concluída/);
  expect(await readVault()).toEqual(original);
}, 10000);

test("conteúdo importado é renderizado como texto, sem interpretar HTML", async () => {
  const fictitious = demo();
  fictitious.patients[0].diagnosis = "<img src=x onerror=alert(1)> fictício";
  await writeVault(await seal(fictitious, pass));
  render(<App />);
  await unlock();
  expect(document.querySelector("img")).toBeNull();
  expect(
    screen.getByText("<img src=x onerror=alert(1)> fictício"),
  ).toBeTruthy();
});
test("bloqueio limpa rascunhos e resultado clínico da interface antes de reabrir", async () => {
  await boot();
  await createVault();
  nav("Visão geral");
  fireEvent.click(screen.getByRole("button", { name: /Registrar gasometria/ }));
  field(screen.getByRole("dialog"), "pH medido", "7.31");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.now() + 300001);
  fireEvent.focus(window);
  expect(screen.getByRole("heading", { name: "Cofre bloqueado" })).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.querySelector("main")).toBeNull();
  vi.useRealTimers();
  await unlock();
  nav("Visão geral");
  fireEvent.click(screen.getByRole("button", { name: /Registrar gasometria/ }));
  expect(
    (
      within(screen.getByRole("dialog")).getByLabelText(
        "pH medido",
      ) as HTMLInputElement
    ).value,
  ).toBe("");
}, 10000);

test("inicialização com verificação duplicada de efeitos não bloqueia a demonstração", async () => {
  render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
  await screen.findByRole("button", { name: "Novo paciente" });
  await newPatient();
  nav("Visão geral");
  expect(
    (screen.getByLabelText("Paciente ativo") as HTMLSelectElement).value,
  ).toBe("RN-900");
});

test("idade usa nascimento e avaliação de hoje, deriva dias automaticamente e permite atualizar hoje", async () => {
  await boot();
  fireEvent.click(screen.getByRole("button", { name: /^Idade e crescimento/ }));
  const d = screen.getByRole("dialog");
  expect(
    within(d).queryByLabelText("Idade pós-natal (dias completos)"),
  ).toBeNull();
  const reference = within(d).getByLabelText(
    "Data e hora da avaliação",
  ) as HTMLInputElement;
  expect(Math.abs(Date.parse(reference.value) - Date.now())).toBeLessThan(2000);
  expect(
    (within(d).getByLabelText("Data e hora do nascimento") as HTMLInputElement)
      .value,
  ).not.toBe("");
  field(d, "IG ao nascer (semanas)", "29");
  field(d, "Dias adicionais da IG", "3");
  field(d, "Data e hora do nascimento", "2026-01-01T08:00");
  field(d, "Data e hora da avaliação", "2026-01-13T08:00");
  expect(
    within(d).getByText("Idade pós-natal calculada: 12 dias completos."),
  ).toBeTruthy();
  fireEvent.click(within(d).getByRole("button", { name: "Calcular" }));
  expect(within(d).getByRole("status").textContent).toContain("IPM: 31s 1d");
  field(d, "Data e hora da avaliação", "2025-12-31T08:00");
  expect(within(d).queryByRole("status")).toBeNull();
  fireEvent.click(within(d).getByRole("button", { name: "Calcular" }));
  await screen.findByText(
    "A avaliação deve ser igual ou posterior ao nascimento.",
  );
  fireEvent.click(within(d).getByRole("button", { name: "Usar data de hoje" }));
  expect(Math.abs(Date.parse(reference.value) - Date.now())).toBeLessThan(2000);
  expect(within(d).queryByRole("status")).toBeNull();
});
