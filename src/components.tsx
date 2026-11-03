import React, { useId } from "react";
import { gasSeries, metricLabels } from "./records";
import { Wind, FlaskConical } from "lucide-react";
import type { Gas, Patient } from "./model";
const stamp = (s: string) =>
  new Date(s).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
export function GasTable({
  gases,
  selected,
  onSelect,
}: {
  gases: Gas[];
  selected?: string[];
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {onSelect && <th>Comparar</th>}
            <th>Coleta</th>
            <th>Amostra</th>
            <th>pH</th>
            <th>
              PCO₂ <small>mmHg</small>
            </th>
            <th>
              HCO₃⁻ <small>mmol/L</small>
            </th>
            <th>
              Lactato <small>mmol/L</small>
            </th>
          </tr>
        </thead>
        <tbody>
          {gases.map((g) => (
            <tr key={g.id}>
              {onSelect && (
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Comparar coleta ${stamp(g.time)}`}
                    checked={selected?.includes(g.id)}
                    onChange={() => onSelect(g.id)}
                  />
                </td>
              )}
              <td>{stamp(g.time)}</td>
              <td>
                <span className="sample">{g.sample}</span>
              </td>
              <td>
                <b>{g.ph.toFixed(2)}</b>
              </td>
              <td>{g.co2}</td>
              <td>{g.hco3}</td>
              <td>{g.lactate ?? "—"}</td>
            </tr>
          ))}
          {!gases.length && (
            <tr>
              <td colSpan={7}>Nenhuma gasometria registrada.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
export function Timeline({ p, limit = 4 }: { p: Patient; limit?: number }) {
  const events = [
    ...p.vents.map((v) => ({
      time: v.time,
      title: `Suporte: ${v.mode}`,
      description: `FiO₂ ${v.fio2}% · ${v.reason}`,
      vent: true,
    })),
    ...p.gases.map((g) => ({
      time: g.time,
      title: "Gasometria registrada",
      description: `${g.sample} · pH ${g.ph} · PCO₂ ${g.co2} mmHg`,
      vent: false,
    })),
  ].sort((a, b) => b.time.localeCompare(a.time));
  return (
    <div className="timeline">
      {events.slice(0, limit).map((e, i) => (
        <div className="event" key={i}>
          <span className={e.vent ? "event-icon blue" : "event-icon"}>
            {e.vent ? <Wind size={15} /> : <FlaskConical size={15} />}
          </span>
          <div>
            <b>{e.title}</b>
            <p>{e.description}</p>
            <small>{stamp(e.time)}</small>
          </div>
        </div>
      ))}
      {!events.length && (
        <p className="muted">Os próximos registros aparecerão aqui.</p>
      )}
    </div>
  );
}
export function Chart({
  gases,
  metric,
}: {
  gases: Gas[];
  metric: "ph" | "co2" | "hco3" | "be" | "lactate";
}) {
  const fillId = useId();
  const values = gasSeries(gases, metric);
  if (!values.length)
    return <div className="chart-empty">Sem dados para este indicador.</div>;
  const vals = values.map((g) => g[metric] as number),
    min = Math.min(...vals) - (metric === "ph" ? 0.03 : 2),
    max = Math.max(...vals) + (metric === "ph" ? 0.03 : 2);
  const start = Date.parse(values[0].time),
    end = Date.parse(values.at(-1)!.time);
  const x = (i: number) =>
      55 +
      (end === start
        ? 260
        : ((Date.parse(values[i].time) - start) * 510) / (end - start)),
    y = (v: number) => 180 - ((v - min) / (max - min)) * 140;
  const points = values
    .map((g, i) => `${x(i)},${y(g[metric] as number)}`)
    .join(" ");
  return (
    <svg
      className="chart"
      viewBox="0 0 620 230"
      role="img"
      aria-label={`Evolução cronológica de ${metric}`}
    >
      <title>
        {metricLabels[metric]} · escala temporal proporcional · amostras
        identificadas em cada ponto
      </title>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#148d8b" stopOpacity=".14" />
          <stop offset="100%" stopColor="#148d8b" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((i) => {
        const v = min + ((max - min) * i) / 3;
        return (
          <g key={i}>
            <line
              x1="55"
              x2="585"
              y1={y(v)}
              y2={y(v)}
              stroke="#e8eef0"
              strokeDasharray="4 4"
            />
            <text x="6" y={y(v) + 4} fill="#87929f" fontSize="11">
              {v.toFixed(metric === "ph" ? 2 : 1)}
            </text>
          </g>
        );
      })}
      <polygon
        points={`${x(0)},185 ${points} ${x(values.length - 1)},185`}
        fill={`url(#${fillId})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke="#128784"
        strokeWidth="2.7"
        strokeLinejoin="round"
      />
      {values.map((g, i) => (
        <g key={g.id}>
          <title>{`${stamp(g.time)} · ${g.sample} · ${metricLabels[metric]}: ${g[metric]}`}</title>
          <circle
            cx={x(i)}
            cy={y(g[metric] as number)}
            r="5"
            fill="white"
            stroke="#128784"
            strokeWidth="2.5"
          />
          <text
            x={x(i)}
            y={y(g[metric] as number) - 14}
            textAnchor="middle"
            fill="#148582"
            fontSize="12"
            fontWeight="600"
          >
            {g[metric]}
          </text>
          <text
            x={x(i)}
            y="216"
            textAnchor="middle"
            fill="#87929f"
            fontSize="11"
          >
            {stamp(g.time)}
          </text>
        </g>
      ))}
    </svg>
  );
}
