import { test } from "node:test";
import assert from "node:assert/strict";
import { tig, ages, oxygenIndex } from "./clinical";
test("TIG: glicose 10%, 3mL/h, 1kg = 5mg/kg/min", () =>
  assert.equal(tig(10, 3, 1), 5));
test("TIG rejeita divisão por zero e valores não finitos", () => {
  assert.throws(() => tig(10, 3, 0));
  assert.throws(() => tig(NaN, 3, 1));
});
test("IPM atravessa semana e idade corrigida preserva sinal", () => {
  assert.equal(ages(29, 3, 12).pma, 218);
  assert.equal(ages(29, 3, 12).corrected, -62);
});
test("limiares gestacionais e dias inválidos", () => {
  assert.equal(ages(37, 0, 0).category, "A termo");
  assert.equal(ages(27, 6, 0).category, "Prematuro extremo");
  assert.throws(() => ages(30, 7, 0));
});
test("IO usa FiO₂ em porcentagem e somente PaO₂ arterial", () => {
  assert.equal(oxygenIndex(40, 10, 80, "Arterial"), 5);
  assert.throws(() => oxygenIndex(40, 10, 80, "Venosa"));
});

import { formatAge, postnatalDays, infusionRate } from "./clinical";
test("idades: 0d, virada de semana, 40 semanas e um ano", () => {
  for (const [w, d, pn, pma, corrected] of [
    [22, 0, 0, 154, -126],
    [29, 6, 1, 210, -70],
    [32, 0, 56, 280, 0],
    [40, 0, 0, 280, 0],
    [40, 0, 365, 645, 365],
    [44, 6, 1, 315, 35],
  ]) {
    assert.equal(ages(w, d, pn).pma, pma);
    assert.equal(ages(w, d, pn).corrected, corrected);
  }
});
test("classificação em todos os limiares de semanas", () => {
  for (const [w, d, c] of [
    [27, 6, "Prematuro extremo"],
    [28, 0, "Muito prematuro"],
    [31, 6, "Muito prematuro"],
    [32, 0, "Prematuro moderado ou tardio"],
    [36, 6, "Prematuro moderado ou tardio"],
    [37, 0, "A termo"],
    [41, 6, "A termo"],
    [42, 0, "Pós-termo"],
  ] as const)
    assert.equal(ages(w, d, 0).category, c);
});
test("idades rejeitam entradas inválidas e fora do escopo técnico", () => {
  for (const values of [
    [21, 6, 0],
    [45, 0, 0],
    [30, -1, 0],
    [30, 7, 0],
    [30.5, 0, 0],
    [30, 0, -1],
    [30, 0, 0.5],
    [30, 0, Infinity],
    [30, 0, NaN],
    [30, 0, Number.MAX_SAFE_INTEGER],
  ])
    assert.throws(() => ages(...(values as [number, number, number])));
  assert.equal(formatAge(-62), "−8s 6d");
  assert.equal(formatAge(0), "0s 0d");
  assert.throws(() => formatAge(NaN));
});
test("idade cronológica: 24h completas, fuso, ano bissexto e datas inválidas", () => {
  assert.equal(
    postnatalDays(
      "2024-02-28T23:30:00-03:00",
      Date.parse("2024-02-29T23:29:59-03:00"),
    ),
    0,
  );
  assert.equal(
    postnatalDays(
      "2024-02-28T23:30:00-03:00",
      Date.parse("2024-02-29T23:30:00-03:00"),
    ),
    1,
  );
  assert.throws(() => postnatalDays("inválido"));
  assert.throws(() =>
    postnatalDays("2030-01-01T00:00:00.000Z", Date.parse("2026-01-01")),
  );
});
test("TIG: oráculo independente em dimensões e pesos de 100g a 10kg", () => {
  for (const w of [0.1, 0.5, 1, 1.245, 3, 10])
    for (const c of [0, 5, 10, 12.5, 25, 50, 100])
      for (const r of [0, 0.01, 1, 3, 10, 50]) {
        const expected = ((c / 100) * 1000 * (r / 60)) / w;
        assert.ok(
          Math.abs(tig(c, r, w) - expected) <= Math.max(1, expected) * 1e-12,
        );
      }
});
test("TIG: resultados de referência adicionais e rejeição de entradas extremas", () => {
  assert.equal(tig(12.5, 2.4, 0.5), 10);
  assert.equal(tig(5, 3, 3), 5 / 6);
  assert.equal(tig(0, 3, 1), 0);
  assert.equal(tig(10, 0, 1), 0);
  for (const v of [
    [10, 3, 0],
    [10, 3, -1],
    [-1, 3, 1],
    [101, 3, 1],
    [10, -1, 1],
    [10, NaN, 1],
    [10, Infinity, 1],
    [NaN, 1, 1],
    [10, 1, Infinity],
    [100, Number.MAX_VALUE, 0.1],
  ])
    assert.throws(() => tig(...(v as [number, number, number])));
});
test("IO e volume: rejeitam NaN, infinito, zero e amostras não arteriais", () => {
  for (const v of [
    [NaN, 10, 80],
    [40, Infinity, 80],
    [40, 10, NaN],
    [40, 10, 0],
    [20, 10, 80],
    [101, 10, 80],
    [40, 0, 80],
  ])
    assert.throws(() =>
      oxygenIndex(...(v as [number, number, number]), "Arterial"),
    );
  for (const s of ["Venosa", "Capilar", ""])
    assert.throws(() => oxygenIndex(40, 10, 80, s));
  assert.equal(infusionRate(120, 24), 5);
  assert.equal(infusionRate(0, 24), 0);
  for (const v of [
    [10, 0],
    [-1, 2],
    [Infinity, 2],
    [1, NaN],
  ])
    assert.throws(() => infusionRate(...(v as [number, number])));
});

import { ageAtEvaluation } from "./clinical";
test("referência por data/hora preserva zero, 24 horas completas e 56 dias", () => {
  assert.equal(
    ageAtEvaluation("2026-01-01T08:00:00Z", "2026-01-01T08:00:00Z"),
    0,
  );
  assert.equal(
    ageAtEvaluation("2026-01-01T08:00:00Z", "2026-01-02T07:59:59Z"),
    0,
  );
  assert.equal(
    ageAtEvaluation("2026-01-01T08:00:00Z", "2026-01-02T08:00:00Z"),
    1,
  );
  assert.equal(
    ageAtEvaluation("2026-01-01T08:00:00Z", "2026-02-26T08:00:00Z"),
    56,
  );
});
test("referência por data/hora considera fuso, passagem de mês/ano e ano bissexto", () => {
  assert.equal(
    ageAtEvaluation("2026-03-08T01:30:00-05:00", "2026-03-09T01:30:00-04:00"),
    0,
  );
  assert.equal(
    ageAtEvaluation("2024-02-28T23:30:00-03:00", "2024-03-01T23:30:00-03:00"),
    2,
  );
  assert.equal(
    ageAtEvaluation("2025-12-31T23:30:00Z", "2026-01-01T23:30:00Z"),
    1,
  );
});
test("referência por data/hora rejeita ausência, valor inválido e avaliação anterior", () => {
  for (const [b, r] of [
    ["", "2026-01-01"],
    ["2026-01-01", ""],
    ["inválido", "2026-01-01"],
    ["2026-01-01", "inválido"],
    ["2026-01-02T08:00Z", "2026-01-01T08:00Z"],
  ])
    assert.throws(() => ageAtEvaluation(b, r));
});
