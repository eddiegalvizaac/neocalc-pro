function finiteResult(value: number) {
  if (!Number.isFinite(value))
    throw Error("Resultado fora da capacidade numérica. Confira as entradas.");
  return value;
}
export function tig(concentration: number, rate: number, weight: number) {
  if (
    ![concentration, rate, weight].every(Number.isFinite) ||
    weight <= 0 ||
    rate < 0 ||
    concentration < 0 ||
    concentration > 100
  )
    throw Error("Confira peso, concentração e taxa.");
  return finiteResult((concentration * rate) / weight / 6);
}
export function ages(weeks: number, days: number, postnatalDays: number) {
  if (
    !Number.isInteger(weeks) ||
    weeks < 22 ||
    weeks > 44 ||
    !Number.isInteger(days) ||
    days < 0 ||
    days > 6 ||
    !Number.isSafeInteger(postnatalDays) ||
    postnatalDays < 0
  )
    throw Error("Informe IG válida e idade pós-natal em dias completos.");
  const total = weeks * 7 + days + postnatalDays;
  if (!Number.isSafeInteger(total))
    throw Error("Idade fora da capacidade numérica.");
  return {
    pma: total,
    corrected: total - 280,
    category:
      weeks < 28
        ? "Prematuro extremo"
        : weeks < 32
          ? "Muito prematuro"
          : weeks < 37
            ? "Prematuro moderado ou tardio"
            : weeks < 42
              ? "A termo"
              : "Pós-termo",
  };
}
export const formatAge = (days: number) => {
  if (!Number.isSafeInteger(days)) throw Error("Idade inválida.");
  return `${days < 0 ? "−" : ""}${Math.floor(Math.abs(days) / 7)}s ${Math.abs(days) % 7}d`;
};
export function oxygenIndex(
  fio2: number,
  map: number,
  pao2: number,
  sample: string,
) {
  if (sample !== "Arterial")
    throw Error("O IO exige PaO₂ de amostra arterial.");
  if (
    ![fio2, map, pao2].every(Number.isFinite) ||
    fio2 < 21 ||
    fio2 > 100 ||
    map <= 0 ||
    pao2 <= 0
  )
    throw Error("Confira as unidades e valores.");
  return finiteResult((fio2 * map) / pao2);
}
export function infusionRate(volume: number, hours: number) {
  if (![volume, hours].every(Number.isFinite) || volume < 0 || hours <= 0)
    throw Error("Informe volume não negativo e duração maior que zero.");
  return finiteResult(volume / hours);
}
export function postnatalDays(born: string, now = Date.now()) {
  const timestamp = new Date(born).getTime();
  if (!Number.isFinite(timestamp) || !Number.isFinite(now) || timestamp > now)
    throw Error("Nascimento inválido ou futuro.");
  return Math.floor((now - timestamp) / 86400000);
}
