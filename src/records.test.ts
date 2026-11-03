import { test } from "node:test";
import assert from "node:assert/strict";
import { demo } from "./model";
import {
  createPatient,
  editPatient,
  archivePatient,
  deletePatient,
  addGas,
  addVent,
  nextPatientId,
  gasSeries,
  numeric,
} from "./records";
import { validateState } from "./validation";
const form = (values: Record<string, string | number>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, String(v));
  return f;
};
const patient = () =>
  form({
    id: "RN-900",
    weeks: 30,
    days: 6,
    born: "2026-01-01T00:00",
    weight: 1400,
    birthWeight: 1300,
    diagnosis: "Prematuridade",
    notes: "Fictício",
  });
const gas = (time: string, ph = 7.3) =>
  form({
    time,
    sample: "Arterial",
    ph,
    co2: 45,
    hco3: 23,
    be: "",
    lactate: "",
    o2: "",
    notes: "Teste fictício",
  });
const vent = (time: string, fio2 = 30) =>
  form({
    time,
    mode: "SIMV",
    fio2,
    peep: 5,
    pip: 18,
    map: 8,
    rate: 40,
    reason: "Ajuste simulado",
  });
test("paciente fictício: criar, editar, pesquisar, arquivar, reativar e excluir sem mutar origem", () => {
  const original = demo();
  let s = createPatient(original, patient());
  assert.equal(original.patients.length, 3);
  s = editPatient(
    s,
    "RN-900",
    form({
      weight: 1450,
      diagnosis: "Observação neonatal",
      notes: "Edição fictícia",
    }),
  );
  assert.equal(s.patients.find((p) => p.id === "RN-900")?.weight, 1450);
  s = archivePatient(s, "RN-900");
  assert.equal(s.patients.at(-1)?.archived, true);
  s = archivePatient(s, "RN-900");
  assert.equal(s.patients.at(-1)?.archived, false);
  assert.throws(() => deletePatient(s, "RN-900", "RN-901"));
  s = deletePatient(s, "RN-900", "RN-900");
  assert.equal(s.patients.length, 3);
  assert.equal(
    s.patients.some((p) => p.id === "RN-900"),
    false,
  );
});
test("IDs sugeridos não colidem após exclusão de paciente intermediário", () => {
  let s = demo();
  s = deletePatient(s, "RN-002", "RN-002");
  const suggestion = nextPatientId(s.patients);
  assert.equal(
    s.patients.some((p) => p.id === suggestion),
    false,
  );
});
test("cadastro rejeita duplicata, futuro, peso inválido e campos vazios sem converter em zero", () => {
  const s = demo(),
    f = patient();
  f.set("id", "RN-001");
  assert.throws(() => createPatient(s, f));
  f.set("id", "RN-900");
  f.set("weight", "0");
  assert.throws(() => createPatient(s, f));
  f.set("weight", "1400");
  f.set("born", "2099-01-01T12:00");
  assert.throws(() => createPatient(s, f));
  assert.throws(() => numeric(new FormData(), "ph"));
  const blank = patient();
  blank.set("id", "Nome do paciente");
  assert.throws(() => createPatient(s, blank));
});
test("gases fora de ordem são ordenados, faltantes preservados e snapshot ventilatório não sobrescrito", () => {
  let s = createPatient(demo(), patient());
  s = addVent(s, "RN-900", vent("2026-01-02T08:00"));
  s = addGas(s, "RN-900", gas("2026-01-02T09:00"));
  s = addGas(s, "RN-900", gas("2026-01-01T12:00", 7.2));
  const before = structuredClone(s.patients.at(-1)!.gases);
  s = addVent(s, "RN-900", vent("2026-01-02T08:30", 40));
  const p = s.patients.at(-1)!;
  assert.deepEqual(p.gases, before);
  assert.equal(p.gases[0].vent, undefined);
  assert.equal(p.gases[1].vent?.fio2, 30);
  assert.equal(p.gases[0].be, undefined);
  assert.equal(p.gases[0].lactate, undefined);
  s = addGas(s, "RN-900", gas("2026-01-02T10:00", 7.35));
  assert.equal(s.patients.at(-1)!.gases.at(-1)?.vent?.fio2, 40);
  assert.equal(s.patients[0].gases.length, 3);
});
test("gases/ventilação rejeitam coleta anterior ao nascimento, futuro, valores inválidos e motivo vazio", () => {
  let s = createPatient(demo(), patient());
  assert.throws(() => addGas(s, "RN-900", gas("2025-12-31T12:00")));
  assert.throws(() => addGas(s, "RN-900", gas("2099-01-01T00:00")));
  assert.throws(() => addGas(s, "RN-900", gas("2026-01-02T00:00", 9)));
  const v = vent("2026-01-02T00:00");
  v.set("fio2", "101");
  assert.throws(() => addVent(s, "RN-900", v));
  v.set("fio2", "30");
  v.set("reason", " ");
  assert.throws(() => addVent(s, "RN-900", v));
});
test("importação rejeita esquema inválido, ID duplicado, valor não finito e snapshot posterior à coleta", () => {
  const broken = demo();
  (broken.patients[0] as unknown as { weeks: string }).weeks = "29";
  assert.throws(() => validateState(broken));
  const dupe = demo();
  dupe.patients.push(dupe.patients[0]);
  assert.throws(() => validateState(dupe));
  const nan = demo();
  nan.patients[0].gases[0].ph = NaN;
  assert.throws(() => validateState(nan));
  assert.throws(() => validateState({ patients: [{}], audit: [] }));
  const snapshot = demo();
  snapshot.patients[0].gases[0].vent = snapshot.patients[0].vents.at(-1);
  assert.throws(() => validateState(snapshot));
  assert.throws(() => validateState({ ...demo(), unknown: "injetado" }));
});
test("séries usam ordem temporal e não confundem ausente com zero", () => {
  const gases = demo().patients[0].gases;
  gases[0].be = 0;
  delete gases[1].be;
  const series = gasSeries([...gases].reverse(), "be");
  assert.equal(series.length, 2);
  assert.equal(series[0].be, 0);
  assert.equal(series[0].id, gases[0].id);
});

test('exclusão remove dados clínicos da trilha do paciente e preserva a de outros pacientes',()=>{const s=demo();s.audit.push({time:new Date().toISOString(),text:'RN-001: peso anterior 1180 g'},{time:new Date().toISOString(),text:'RN-002: acompanhamento simulado'});const deleted=deletePatient(s,'RN-001','RN-001');assert.equal(deleted.audit.some(a=>a.text.includes('1180')),false);assert.ok(deleted.audit.some(a=>a.text.startsWith('RN-002:')));assert.equal(s.audit.some(a=>a.text.includes('1180')),true)});
