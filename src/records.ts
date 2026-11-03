import type { State, Patient, Gas, Vent } from "./model";
import { validateState } from "./validation";
export function numeric(f: FormData, k: string) {
  const v = f.get(k);
  if (typeof v !== "string" || !v.trim())
    throw Error(`Campo numérico obrigatório: ${k}.`);
  const n = Number(v.replace(",", "."));
  if (!Number.isFinite(n)) throw Error(`Valor numérico inválido: ${k}.`);
  return n;
}
const text = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v : "";
};
function date(f: FormData, k: string, born?: string) {
  const n = Date.parse(text(f, k));
  if (!Number.isFinite(n) || n > Date.now() || (born && n < Date.parse(born)))
    throw Error(
      "Data inválida: não pode ser futura nem anterior ao nascimento.",
    );
  return new Date(n).toISOString();
}
const optional = (f: FormData, k: string) =>
  text(f, k).trim() ? { [k]: numeric(f, k) } : {};
export function nextPatientId(patients: Patient[]) {
  const used = new Set(patients.map((p) => p.id));
  for (let i = 1; i <= 999999; i++) {
    const id = `RN-${String(i).padStart(3, "0")}`;
    if (!used.has(id)) return id;
  }
  throw Error("Limite de identificadores atingido.");
}
export function createPatient(state: State, f: FormData): State {
  const id = text(f, "id").trim();
  if (state.patients.some((p) => p.id === id))
    throw Error("Este código já está cadastrado.");
  const p: Patient = {
    id,
    weeks: numeric(f, "weeks"),
    days: numeric(f, "days"),
    born: date(f, "born"),
    birthWeight: numeric(f, "birthWeight"),
    weight: numeric(f, "weight"),
    diagnosis: text(f, "diagnosis"),
    notes: text(f, "notes"),
    archived: false,
    gases: [],
    vents: [],
  };
  return validateState({ ...state, patients: [...state.patients, p] });
}
function replacePatient(
  state: State,
  id: string,
  change: (p: Patient) => Patient,
): State {
  if (!state.patients.some((p) => p.id === id))
    throw Error("Paciente não encontrado.");
  return validateState({
    ...state,
    patients: state.patients.map((p) => (p.id === id ? change(p) : p)),
  });
}
export function editPatient(state: State, id: string, f: FormData) {
  return replacePatient(state, id, (p) => ({
    ...p,
    weight: numeric(f, "weight"),
    diagnosis: text(f, "diagnosis"),
    notes: text(f, "notes"),
  }));
}
export function archivePatient(state: State, id: string) {
  return replacePatient(state, id, (p) => ({ ...p, archived: !p.archived }));
}
export function deletePatient(state: State, id: string, confirmation: string) {
  if (id !== confirmation) throw Error("Código incorreto.");
  if (!state.patients.some((p) => p.id === id))
    throw Error("Paciente não encontrado.");
  return {
    ...state,
    patients: state.patients.filter((p) => p.id !== id),
    audit: state.audit.filter((a) => !a.text.startsWith(id + ":")),
  };
}
export function addGas(state: State, id: string, f: FormData) {
  return replacePatient(state, id, (p) => {
    const time = date(f, "time", p.born),
      current = [...p.vents]
        .filter((v) => v.time <= time)
        .sort((a, b) => a.time.localeCompare(b.time))
        .at(-1);
    const g: Gas = {
      id: crypto.randomUUID(),
      time,
      sample: text(f, "sample"),
      ph: numeric(f, "ph"),
      co2: numeric(f, "co2"),
      hco3: numeric(f, "hco3"),
      ...optional(f, "be"),
      ...optional(f, "lactate"),
      ...optional(f, "o2"),
      notes: text(f, "notes"),
      ...(current ? { vent: { ...current } } : {}),
    };
    return { ...p, gases: [...p.gases, g] };
  });
}
export function addVent(state: State, id: string, f: FormData) {
  return replacePatient(state, id, (p) => {
    const v: Vent = {
      id: crypto.randomUUID(),
      time: date(f, "time", p.born),
      mode: text(f, "mode"),
      fio2: numeric(f, "fio2"),
      peep: numeric(f, "peep"),
      reason: text(f, "reason").trim(),
      ...optional(f, "pip"),
      ...optional(f, "map"),
      ...optional(f, "rate"),
    };
    if (!v.reason) throw Error("Informe o motivo do ajuste.");
    return { ...p, vents: [...p.vents, v] };
  });
}
export type Metric = "ph" | "co2" | "hco3" | "be" | "lactate";
export const metricLabels: Record<Metric, string> = {
  ph: "pH (sem unidade)",
  co2: "PCO₂ (mmHg)",
  hco3: "HCO₃⁻ (mmol/L)",
  be: "BE (mmol/L)",
  lactate: "Lactato (mmol/L)",
};
export function gasSeries(gases: Gas[], metric: Metric) {
  return [...gases]
    .filter((g) => typeof g[metric] === "number" && Number.isFinite(g[metric]))
    .sort((a, b) => a.time.localeCompare(b.time));
}
