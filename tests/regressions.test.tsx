import React from "react";
import { test, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Chart } from "../src/components";
import { oxygenIndex, ages } from "../src/clinical";
import App from "../src/App";
import type { Gas } from "../src/model";
test("regressão: IO rejeita NaN e Infinity", () => {
  expect(() => oxygenIndex(NaN, 10, 80, "Arterial")).toThrow();
  expect(() => oxygenIndex(40, Infinity, 80, "Arterial")).toThrow();
});
test("regressão: idade em dias completos não aceita fração", () =>
  expect(() => ages(29, 3, 0.5)).toThrow());
test("regressão: eixo cronológico representa intervalos reais", () => {
  const gases = [0, 1, 10].map((d, i) => ({
    id: String(i),
    time: new Date(Date.UTC(2026, 0, 1 + d)).toISOString(),
    sample: "Arterial",
    ph: 7.2 + i * 0.05,
    co2: 45,
    hco3: 22,
  })) as Gas[];
  const { container } = render(<Chart gases={gases} metric="ph" />);
  const points = [...container.querySelectorAll("circle")].map((c) =>
    Number(c.getAttribute("cx")),
  );
  expect((points[1] - points[0]) / (points[2] - points[0])).toBeCloseTo(0.1);
});
test("regressão: histórico completo inclui mais de quatro eventos", async () => {
  render(<App />);
  await screen.findByRole("button", { name: "Histórico" });
  fireEvent.click(screen.getByRole("button", { name: "Histórico" }));
  expect(document.querySelectorAll(".timeline .event")).toHaveLength(5);
});
test("regressão: interface não declara offline pronto a partir de onLine", async () => {
  render(<App />);
  await screen.findByRole("button", { name: "Novo paciente" });
  expect(screen.queryByText("Disponível offline")).toBeNull();
});
