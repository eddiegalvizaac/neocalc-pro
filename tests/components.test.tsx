import React from "react";
import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Chart, GasTable, Timeline } from "../src/components";
import { demo } from "../src/model";
import { metricLabels, type Metric } from "../src/records";
test("cada gráfico contém exatamente os valores registrados e amostra identificada", () => {
  const p = demo().patients[0];
  for (const metric of ["ph", "co2", "hco3", "be", "lactate"] as Metric[]) {
    const { container, unmount } = render(
      <Chart gases={p.gases} metric={metric} />,
    );
    const groups = [...container.querySelectorAll("g")].filter((g) =>
      g.querySelector("circle"),
    );
    expect(groups).toHaveLength(p.gases.length);
    groups.forEach((g, i) => {
      expect(g.querySelector("text")?.textContent).toBe(
        String(p.gases[i][metric]),
      );
      expect(g.querySelector("title")?.textContent).toContain(
        metricLabels[metric],
      );
      expect(g.querySelector("title")?.textContent).toContain(
        p.gases[i].sample,
      );
    });
    unmount();
  }
});
test("gráficos tratam ausência, ponto único, zeros e horários repetidos sem coordenadas NaN", () => {
  const p = demo().patients[0],
    g = { ...p.gases[0], be: 0 };
  for (const gases of [[], [g], [g, { ...g, id: "outro" }]]) {
    const { container, unmount } = render(<Chart gases={gases} metric="be" />);
    expect(container.innerHTML).not.toContain("NaN");
    expect(container.querySelectorAll("circle")).toHaveLength(gases.length);
    if (!gases.length)
      expect(screen.getByText("Sem dados para este indicador.")).toBeTruthy();
    unmount();
  }
});
test("tabela e timeline mostram dados armazenados e histórico completo sob demanda", () => {
  const p = demo().patients[0],
    { container, unmount } = render(<GasTable gases={p.gases} />);
  expect(container.querySelectorAll("tbody tr")).toHaveLength(3);
  expect(container.textContent).toContain("7.25");
  expect(container.textContent).toContain("54");
  unmount();
  const view = render(<Timeline p={p} />);
  expect(view.container.querySelectorAll(".event")).toHaveLength(4);
  view.rerender(<Timeline p={p} limit={Infinity} />);
  expect(view.container.querySelectorAll(".event")).toHaveLength(5);
});
