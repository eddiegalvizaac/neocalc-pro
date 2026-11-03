export type Gas = {
  id: string;
  time: string;
  sample: string;
  ph: number;
  co2: number;
  hco3: number;
  be?: number;
  lactate?: number;
  o2?: number;
  vent?: Vent;
  notes?: string;
};
export type Vent = {
  id: string;
  time: string;
  mode: string;
  fio2: number;
  pip?: number;
  peep: number;
  map?: number;
  rate?: number;
  reason: string;
};
export type Patient = {
  id: string;
  weeks: number;
  days: number;
  born: string;
  birthWeight: number;
  weight: number;
  diagnosis: string;
  notes: string;
  archived: boolean;
  gases: Gas[];
  vents: Vent[];
};
export type State = {
  patients: Patient[];
  audit: { time: string; text: string }[];
};
const time = (days: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return new Date(Math.min(d.getTime(), Date.now())).toISOString();
};
export const demo = (): State => {
  const state: State = {
    patients: [
      {
        id: "RN-001",
        weeks: 29,
        days: 3,
        born: time(12, 8),
        birthWeight: 1180,
        weight: 1245,
        diagnosis: "Síndrome do desconforto respiratório",
        notes: "Acompanhamento demonstrativo. Todos os dados são simulados.",
        archived: false,
        vents: [
          {
            id: "v1",
            time: time(1, 8),
            mode: "SIMV + VG",
            fio2: 35,
            pip: 19,
            peep: 5,
            map: 9,
            rate: 40,
            reason: "Registro inicial simulado",
          },
          {
            id: "v2",
            time: time(0, 8),
            mode: "SIMV + VG",
            fio2: 30,
            pip: 18,
            peep: 5,
            map: 8,
            rate: 35,
            reason: "Reavaliação clínica simulada",
          },
        ],
        gases: [
          {
            id: "g1",
            time: time(2, 8),
            sample: "Arterial",
            ph: 7.25,
            co2: 54,
            hco3: 23,
            be: -4,
            lactate: 2.4,
          },
          {
            id: "g2",
            time: time(1, 8),
            sample: "Arterial",
            ph: 7.29,
            co2: 49,
            hco3: 23.1,
            be: -3,
            lactate: 1.9,
          },
          {
            id: "g3",
            time: time(0, 8),
            sample: "Arterial",
            ph: 7.34,
            co2: 43,
            hco3: 22.8,
            be: -2,
            lactate: 1.5,
          },
        ],
      },
      {
        id: "RN-002",
        weeks: 34,
        days: 1,
        born: time(5, 11),
        birthWeight: 2100,
        weight: 2040,
        diagnosis: "Prematuridade",
        notes: "Paciente simulado",
        archived: false,
        vents: [
          {
            id: "v3",
            time: time(0, 7),
            mode: "CPAP",
            fio2: 25,
            peep: 5,
            reason: "Registro simulado",
          },
        ],
        gases: [],
      },
      {
        id: "RN-003",
        weeks: 38,
        days: 2,
        born: time(2, 6),
        birthWeight: 3120,
        weight: 3010,
        diagnosis: "Observação neonatal",
        notes: "Paciente simulado",
        archived: false,
        vents: [
          {
            id: "v4",
            time: time(0, 6),
            mode: "Ar ambiente",
            fio2: 21,
            peep: 0,
            reason: "Registro simulado",
          },
        ],
        gases: [],
      },
    ],
    audit: [
      {
        time: new Date().toISOString(),
        text: "Ambiente de demonstração iniciado — dados simulados",
      },
    ],
  };
  for (const p of state.patients)
    for (const g of p.gases) {
      const v = p.vents.filter((v) => v.time <= g.time).at(-1);
      if (v) g.vent = { ...v };
    }
  return state;
};
