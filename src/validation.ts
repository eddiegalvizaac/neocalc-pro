import type { State, Patient, Gas, Vent } from "./model";
import { ages } from "./clinical";
const error = () => {
  throw Error(
    "Estrutura de dados inválida ou fora dos limites técnicos. Nenhum registro foi importado.",
  );
};
const object = (v: unknown, keys: string[]) => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return error();
  const o = v as Record<string, unknown>;
  if (Object.keys(o).some((k) => !keys.includes(k))) return error();
  return o;
};
const str = (v: unknown, max = 10000) => {
  if (typeof v !== "string" || v.length > max) return error();
  return v;
};
const number = (v: unknown, min: number, max = Number.MAX_VALUE) => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max)
    return error();
  return v;
};
const timestamp = (v: unknown) => {
  const s = str(v, 30);
  if (!Number.isFinite(Date.parse(s)) || new Date(s).toISOString() !== s)
    return error();
  return s;
};
const list = (v: unknown, max: number) => {
  if (!Array.isArray(v) || v.length > max) return error();
  return v as unknown[];
};
const id = (v: unknown) => {
  const s = str(v, 100);
  if (!s.length) return error();
  return s;
};
const optional = (
  o: Record<string, unknown>,
  k: string,
  min: number,
  max = Number.MAX_VALUE,
) => (o[k] === undefined ? {} : { [k]: number(o[k], min, max) });
function vent(v: unknown): Vent {
  const o = object(v, [
    "id",
    "time",
    "mode",
    "fio2",
    "pip",
    "peep",
    "map",
    "rate",
    "reason",
  ]);
  const mode = str(o.mode, 100);
  if (
    ![
      "CPAP",
      "NIPPV",
      "SIMV",
      "A/C",
      "SIMV + VG",
      "VG/VTV",
      "HFOV",
      "Ar ambiente",
      "Outra",
    ].includes(mode)
  )
    return error();
  return {
    id: id(o.id),
    time: timestamp(o.time),
    mode,
    fio2: number(o.fio2, 21, 100),
    peep: number(o.peep, 0),
    reason: str(o.reason),
    ...optional(o, "pip", 0),
    ...optional(o, "map", 0),
    ...optional(o, "rate", 0),
  };
}
function gas(v: unknown): Gas {
  const o = object(v, [
    "id",
    "time",
    "sample",
    "ph",
    "co2",
    "hco3",
    "be",
    "lactate",
    "o2",
    "vent",
    "notes",
  ]);
  const sample = str(o.sample, 20);
  if (!["Arterial", "Venosa", "Capilar"].includes(sample)) return error();
  return {
    id: id(o.id),
    time: timestamp(o.time),
    sample,
    ph: number(o.ph, 6, 8.5),
    co2: number(o.co2, 1, 250),
    hco3: number(o.hco3, 0, 100),
    ...optional(o, "be", -50, 50),
    ...optional(o, "lactate", 0, 50),
    ...optional(o, "o2", 1, 800),
    ...(o.vent === undefined ? {} : { vent: vent(o.vent) }),
    ...(o.notes === undefined ? {} : { notes: str(o.notes) }),
  };
}
function unique<T extends { id: string }>(items: T[]) {
  if (new Set(items.map((x) => x.id)).size !== items.length) return error();
  return items;
}
export function validateState(value: unknown): State {
  const o = object(value, ["patients", "audit"]);
  const patients = unique(
    list(o.patients, 1000).map((v): Patient => {
      const p = object(v, [
        "id",
        "weeks",
        "days",
        "born",
        "birthWeight",
        "weight",
        "diagnosis",
        "notes",
        "archived",
        "gases",
        "vents",
      ]);
      const code = id(p.id);
      if (!/^RN-\d{3,6}$/.test(code)) return error();
      const weeks = number(p.weeks, 22, 44),
        days = number(p.days, 0, 6);
      ages(weeks, days, 0);
      if (typeof p.archived !== "boolean") return error();
      const born = timestamp(p.born);
      if (Date.parse(born) > Date.now()) return error();
      const vents = unique(list(p.vents, 20000).map(vent)).sort((a, b) =>
        a.time.localeCompare(b.time),
      );
      const gases = unique(list(p.gases, 20000).map(gas)).sort((a, b) =>
        a.time.localeCompare(b.time),
      );
      if (
        [...vents, ...gases].some(
          (x) => x.time < born || Date.parse(x.time) > Date.now(),
        ) ||
        gases.some((g) => g.vent && g.vent.time > g.time)
      )
        return error();
      return {
        id: code,
        weeks,
        days,
        born,
        birthWeight: number(p.birthWeight, 100),
        weight: number(p.weight, 100),
        diagnosis: str(p.diagnosis, 300),
        notes: str(p.notes),
        archived: p.archived,
        gases,
        vents,
      };
    }),
  );
  const audit = list(o.audit, 100000).map((v) => {
    const a = object(v, ["time", "text"]);
    return { time: timestamp(a.time), text: str(a.text, 12000) };
  });
  return { patients, audit };
}
