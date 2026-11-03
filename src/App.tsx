import { GasTable, Timeline, Chart } from "./components";
import React, { useEffect, useState, useRef } from "react";
import {
  Activity,
  LayoutDashboard,
  Users,
  FlaskConical,
  Wind,
  Pill,
  Droplets,
  History,
  Settings,
  ChevronDown,
  ArrowUpRight,
  Plus,
  Search,
  ShieldCheck,
  Lock,
  Calculator,
  ArrowRight,
  Download,
  X,
  HeartPulse,
  Check,
  Menu,
  BookOpen,
  Clock,
  TrendingUp,
} from "lucide-react";
import {
  ages,
  formatAge,
  tig,
  oxygenIndex,
  infusionRate,
  postnatalDays,
} from "./clinical";

import { MAX_BACKUP_BYTES } from "./storage";
import { useSession } from "./useSession";
import {
  numeric,
  createPatient,
  editPatient,
  archivePatient,
  deletePatient,
  addGas,
  addVent,
  nextPatientId,
} from "./records";
const sections = [
  "Visão geral",
  "Pacientes",
  "Gasometrias",
  "Ventilação",
  "Calculadoras",
  "Medicações",
  "Hidratação e Nutrição",
  "Histórico",
  "Configurações",
];
const icons = [
  LayoutDashboard,
  Users,
  FlaskConical,
  Wind,
  Calculator,
  Pill,
  Droplets,
  History,
  Settings,
];
const stamp = (s: string) =>
  new Date(s).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
const nowLocal = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
const num = numeric;
const Field = ({
  label,
  name,
  value,
  type = "number",
  required = true,
  min,
  max,
  step = "any",
}: {
  label: string;
  name: string;
  value?: string | number;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: string;
}) => (
  <label>
    {label}
    <input
      name={name}
      defaultValue={value}
      type={type}
      required={required}
      min={min}
      max={max}
      step={step}
      inputMode={type === "number" ? "decimal" : undefined}
    />
  </label>
);
export default function App() {
  const [notice, setNotice] = useState("");
  const session = useSession(setNotice);
  const { state, ready, locked, secure, busy, commit, lock } = session;
  const [active, setActive] = useState("RN-001"),
    [section, setSection] = useState("Visão geral"),
    [modal, setModal] = useState(""),
    [query, setQuery] = useState(""),
    [archived, setArchived] = useState(false),
    [metric, setMetric] = useState<"ph" | "co2" | "hco3" | "be" | "lactate">(
      "ph",
    ),
    [mobile, setMobile] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [calc, setCalc] = useState("TIG"),
    [result, setResult] = useState(""),
    [offline, setOffline] = useState(!navigator.onLine);
  const drafts = useRef<Record<string, Record<string, string>>>({});
  const [, refreshClock] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => refreshClock((v) => v + 1), 60000);
    return () => clearInterval(timer);
  }, []);
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!state.patients.some((p) => p.id === active)) {
      setActive(state.patients[0]?.id ?? "");
      setSelected([]);
    }
  }, [state, active]);
  useEffect(() => {
    if (locked) {
      drafts.current = {};
      setModal("");
      setResult("");
      setSelected([]);
      setQuery("");
      setMobile(false);
    }
  }, [locked]);
  useEffect(() => {
    if (!modal) return;
    const trigger = document.activeElement as HTMLElement | null;
    const dialog = modalRef.current;
    if (!dialog) return;
    const selectors =
      "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]";
    const elements = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(selectors));
    (
      dialog.querySelector<HTMLElement>("input,select,textarea") ??
      elements()[0]
    )?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        setModal("");
      }
      if (e.key === "Tab") {
        const items = elements(),
          first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    dialog.addEventListener("keydown", key);
    return () => {
      dialog.removeEventListener("keydown", key);
      if (trigger?.isConnected) trigger.focus();
    };
  }, [modal, busy]);
  useEffect(() => {
    if (modal && drafts.current[modal + active]) {
      const form = document.querySelector(
        ".modal form",
      ) as HTMLFormElement | null;
      if (form)
        Object.entries(drafts.current[modal + active]).forEach(([k, v]) => {
          const el = form.elements.namedItem(k) as HTMLInputElement | null;
          if (el) el.value = v;
        });
    }
  }, [modal, active]);
  const p = state.patients.find((p) => p.id === active) || state.patients[0];
  const vent = p?.vents.at(-1),
    gas = p?.gases.at(-1);
  const post = p ? postnatalDays(p.born) : 0;
  const age = p ? ages(p.weeks, p.days, post) : null;
  useEffect(() => {
    const fn = () => setOffline(!navigator.onLine);
    addEventListener("online", fn);
    addEventListener("offline", fn);
    return () => {
      removeEventListener("online", fn);
      removeEventListener("offline", fn);
    };
  }, []);
  useEffect(() => {
    const failed = () =>
      setNotice(
        "Service worker indisponível. Instalação e offline não confirmados.",
      );
    window.addEventListener("neocalc-sw-error", failed);
    return () => window.removeEventListener("neocalc-sw-error", failed);
  }, []);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 7000);
      return () => clearTimeout(t);
    }
  }, [notice]);
  function go(s: string) {
    setSection(s);
    setMobile(false);
    setSelected([]);
  }
  function openCalc(name: string) {
    setCalc(name);
    setResult("");
    setModal("calc");
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      session.assertOpen();
      if (modal === "patient") {
        const id = String(f.get("id")).trim();
        await commit(
          (s) => createPatient(s, f),
          `${id}: acompanhamento criado`,
        );
        setActive(id);
      } else if (p) {
        if (modal === "edit")
          await commit(
            (s) => editPatient(s, p.id, f),
            `${p.id}: dados atualizados (peso anterior ${p.weight} g)`,
          );
        if (modal === "gas")
          await commit(
            (s) => addGas(s, p.id, f),
            `${p.id}: gasometria registrada`,
          );
        if (modal === "vent")
          await commit(
            (s) => addVent(s, p.id, f),
            `${p.id}: suporte respiratório registrado`,
          );
      }
      delete drafts.current[modal + active];
      setModal("");
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  async function vault(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await session.unlock(String(f.get("password")));
      drafts.current = {};
      setSelected([]);
      setModal("");
    } catch (e) {
      setNotice(
        "Não foi possível abrir o cofre. Confira a senha e a disponibilidade dos dados. " +
          (e as Error).message,
      );
    }
  }
  async function backup() {
    try {
      const encrypted = await session.encryptedBackup();
      session.assertOpen();
      const a = document.createElement("a"),
        url = URL.createObjectURL(
          new Blob([JSON.stringify(encrypted)], { type: "application/json" }),
        );
      a.href = url;
      a.download = "neocalc-backup-criptografado.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        "Backup criptografado exportado. Guarde sua senha em local seguro.",
      );
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  async function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget,
      file = input.files?.[0];
    try {
      if (!file) return;
      if (file.size > MAX_BACKUP_BYTES)
        throw Error("Backup excede o limite de 10 MB.");
      const imported = await session.importBackup(await file.text(), () =>
        confirm(
          "Substituir os registros atuais pelos registros deste backup? Exporte um backup atual antes de prosseguir.",
        ),
      );
      if (imported) {
        drafts.current = {};
        setSelected([]);
      }
    } catch (e) {
      setNotice("Importação não concluída: " + (e as Error).message);
    } finally {
      input.value = "";
    }
  }
  async function persist() {
    try {
      const granted = await navigator.storage?.persist?.();
      setNotice(
        granted
          ? "Persistência concedida pelo navegador."
          : "Persistência indisponível ou não concedida. Mantenha backups.",
      );
    } catch {
      setNotice("Não foi possível solicitar persistência. Mantenha backups.");
    }
  }
  if (!ready)
    return (
      <div className="lockscreen" role="status">
        Verificando armazenamento local…
      </div>
    );

  if (locked)
    return (
      <div className="lockscreen">
        <div className="card">
          <Lock size={32} />
          <h1>Cofre bloqueado</h1>
          <p>Seus registros estão protegidos neste dispositivo.</p>
          <form onSubmit={vault}>
            <Field label="Senha do cofre" name="password" type="password" />
            <button className="primary" disabled={busy}>
              Desbloquear
            </button>
          </form>
          <button
            className="text-button"
            disabled={busy}
            onClick={session.startDemo}
          >
            Abrir demonstração sem acessar o cofre
          </button>
          <p className="muted">
            Sem recuperação de senha. Use seu backup para recuperação em outro
            dispositivo.
          </p>
        </div>
        {notice && (
          <div className="toast" role="status">
            {notice}
          </div>
        )}
      </div>
    );
  return (
    <>
      <aside
        className={mobile ? "sidebar open" : "sidebar"}
        inert={modal ? true : undefined}
      >
        <button
          className="brand"
          aria-label="NeoCalc Pro — visão geral"
          onClick={() => go("Visão geral")}
        >
          <span className="brand-icon">
            <Activity />
          </span>
          <span>
            NeoCalc <b>Pro</b>
            <small>CUIDADO EM CADA CÁLCULO</small>
          </span>
        </button>
        <div className="workspace">
          <span className="workspace-icon">
            <HeartPulse size={19} />
          </span>
          <div>
            Neonatologia<small>Área de trabalho</small>
          </div>
        </div>
        <div className="nav-label">PRINCIPAL</div>
        <nav>
          {sections.map((s, i) => {
            const Icon = icons[i];
            return (
              <button
                key={s}
                className={section === s ? "nav active" : "nav"}
                aria-current={section === s ? "page" : undefined}
                onClick={() => go(s)}
              >
                <Icon size={19} />
                <span>{s}</span>
                {s === "Pacientes" && (
                  <em>{state.patients.filter((p) => !p.archived).length}</em>
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="local">
            <ShieldCheck size={18} />
            <span>
              {secure ? "Cofre local ativo" : "Ambiente de demonstração"}
              <small>
                {secure
                  ? "AES-GCM • neste dispositivo"
                  : "Dados simulados • sem uso assistencial"}
              </small>
            </span>
          </div>
          <button className="profile" onClick={() => go("Configurações")}>
            <span>NP</span>
            <div>
              Profissional de saúde<small>Neonatologia</small>
            </div>
            <Settings size={17} />
          </button>
        </div>
      </aside>
      <div className="app" inert={modal ? true : undefined}>
        <header>
          <div className="crumb">
            <button
              className="mobile-menu icon-btn"
              aria-label="Abrir menu"
              aria-expanded={mobile}
              onClick={() => setMobile(!mobile)}
            >
              <Menu />
            </button>
            Área de trabalho <span>/</span>{" "}
            <b>{section === "Visão geral" ? "NeoMonitor" : section}</b>
          </div>
          <div className="header-right">
            <span className="status">
              <i />
              {offline ? "Navegador offline" : "Navegador online"}
            </span>
            <button
              className="icon-btn"
              title="Segurança local"
              aria-label="Segurança local"
              onClick={() => setModal("vault")}
            >
              <ShieldCheck size={19} />
            </button>
            <span className="avatar">NP</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                NEOMONITOR <span>●</span> ACOMPANHAMENTO NEONATAL
              </div>
              <h1>
                {section === "Visão geral"
                  ? "Uma visão completa do cuidado."
                  : section}
              </h1>
              <p>
                {section === "Visão geral"
                  ? "Informações conectadas para acompanhar cada etapa da evolução."
                  : "Ferramentas organizadas para o seu plantão."}
              </p>
            </div>
            <button className="primary" onClick={() => setModal("patient")}>
              <Plus size={17} /> Novo paciente
            </button>
          </div>
          <div className="demo-bar">
            <FlaskConical size={15} />
            <b>Modo demonstração</b>
            <span>
              Dados simulados. Versão em desenvolvimento, sem validação para uso
              assistencial.
            </span>
            <button onClick={() => go("Configurações")}>
              Saiba mais <ArrowUpRight size={14} />
            </button>
          </div>
          {(section === "Visão geral" ||
            section === "Gasometrias" ||
            section === "Ventilação" ||
            section === "Histórico") &&
            p && (
              <>
                <div className="patient-strip">
                  <span className="patient-avatar">
                    <Users size={25} />
                  </span>
                  <div className="patient-title">
                    <select
                      aria-label="Paciente ativo"
                      value={p.id}
                      onChange={(e) => {
                        setActive(e.target.value);
                        setSelected([]);
                      }}
                    >
                      {state.patients.map((p) => (
                        <option key={p.id}>{p.id}</option>
                      ))}
                    </select>
                    <small>
                      Paciente ativo <i />{" "}
                      {p.archived ? "Arquivado" : "Em acompanhamento"}
                    </small>
                  </div>
                  <div className="patient-info">
                    <span>
                      IG ao nascer
                      <b>
                        {p.weeks}s {p.days}d
                      </b>
                    </span>
                    <span>
                      Idade pós-natal<b>{post} dias</b>
                    </span>
                    <span>
                      Diagnóstico principal<b>{p.diagnosis}</b>
                    </span>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setModal("edit")}
                  >
                    Ver paciente <ArrowUpRight size={16} />
                  </button>
                </div>
              </>
            )}
          {section === "Visão geral" && p && (
            <>
              <div className="stats">
                <div className="stat">
                  <span>
                    Peso atual <TrendingUp size={17} />
                  </span>
                  <strong>
                    {p.weight.toLocaleString("pt-BR")} <small>g</small>
                  </strong>
                  <p>
                    Ao nascer: {p.birthWeight.toLocaleString("pt-BR")} g{" "}
                    <b>{((p.weight / p.birthWeight - 1) * 100).toFixed(1)}%</b>
                  </p>
                </div>
                <div className="stat">
                  <span>
                    Idade pós-menstrual <Clock size={17} />
                  </span>
                  <strong>{formatAge(age!.pma)}</strong>
                  <p>
                    IG ao nascer: {p.weeks}s {p.days}d
                  </p>
                </div>
                <div className="stat">
                  <span>
                    Suporte respiratório <Wind size={18} />
                  </span>
                  <strong className="smaller">
                    {vent?.mode || "Não registrado"}
                  </strong>
                  <p>
                    {vent
                      ? `FiO₂ ${vent.fio2}% · PEEP ${vent.peep} cmH₂O`
                      : "Adicione um registro ventilatório"}
                  </p>
                </div>
                <div className="stat">
                  <span>
                    Última gasometria <FlaskConical size={17} />
                  </span>
                  <strong>
                    {gas ? gas.ph.toFixed(2).replace(".", ",") : "—"}{" "}
                    <small>pH</small>
                  </strong>
                  <p>
                    {gas
                      ? `${gas.sample} · ${stamp(gas.time)}`
                      : "Sem coleta registrada"}
                  </p>
                </div>
              </div>
              <div className="dashboard-grid">
                <section className="card chart-card">
                  <div className="card-heading">
                    <div>
                      <h2>Evolução gasométrica</h2>
                      <p>Acompanhe as tendências ao longo do tempo</p>
                    </div>
                    <button
                      className="subtle"
                      onClick={() => go("Gasometrias")}
                    >
                      Ver registros <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <div className="chart-tabs">
                    {(["ph", "co2", "hco3", "be", "lactate"] as const).map(
                      (m, i) => (
                        <button
                          className={metric === m ? "selected" : ""}
                          onClick={() => setMetric(m)}
                          key={m}
                        >
                          {["pH", "PCO₂", "HCO₃⁻", "BE", "Lactato"][i]}
                        </button>
                      ),
                    )}
                    <span>Últimas coletas</span>
                  </div>
                  <Chart gases={p.gases} metric={metric} />
                  <div className="chart-footer">
                    <span>
                      <i /> {metric === "ph" ? "pH" : metric.toUpperCase()} ·
                      valores registrados
                    </span>
                    <span>Sem inferência de causalidade</span>
                  </div>
                </section>
                <section className="card quick-card">
                  <div className="card-heading">
                    <div>
                      <h2>Ações rápidas</h2>
                      <p>O essencial, a um toque</p>
                    </div>
                    <span className="tiny-icon">
                      <Activity size={18} />
                    </span>
                  </div>
                  <button
                    className="action gas-action"
                    onClick={() => setModal("gas")}
                  >
                    <span className="action-icon">
                      <FlaskConical size={20} />
                    </span>
                    <div>
                      Registrar gasometria
                      <small>Nova coleta e parâmetros associados</small>
                    </div>
                    <Plus size={18} />
                  </button>
                  <button className="action" onClick={() => setModal("vent")}>
                    <span className="action-icon">
                      <Wind size={20} />
                    </span>
                    <div>
                      Registrar ventilação
                      <small>Documentar parâmetros e ajustes</small>
                    </div>
                    <Plus size={18} />
                  </button>
                  <button className="action" onClick={() => openCalc("TIG")}>
                    <span className="action-icon">
                      <Calculator size={20} />
                    </span>
                    <div>
                      Abrir calculadoras
                      <small>Cálculos com fórmulas transparentes</small>
                    </div>
                    <ArrowRight size={18} />
                  </button>
                  <div className="care-note">
                    <ShieldCheck size={19} />
                    <p>
                      O cuidado começa com a conferência.
                      <small>
                        Confirme dados e unidades antes de cada cálculo.
                      </small>
                    </p>
                  </div>
                </section>
                <section className="card">
                  <div className="card-heading">
                    <div>
                      <h2>Gasometrias recentes</h2>
                      <p>Últimos registros de {p.id}</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => go("Gasometrias")}
                    >
                      Ver todas <ArrowRight size={15} />
                    </button>
                  </div>
                  <GasTable gases={p.gases.slice(-3).reverse()} />
                </section>
                <section className="card">
                  <div className="card-heading">
                    <div>
                      <h2>Linha do tempo</h2>
                      <p>Registros do acompanhamento</p>
                    </div>
                    <button
                      className="icon-btn"
                      aria-label="Ver histórico"
                      onClick={() => go("Histórico")}
                    >
                      <History size={18} />
                    </button>
                  </div>
                  <Timeline p={p} />
                </section>
              </div>
              <div className="section-label">
                <h2>Calculadoras para o plantão</h2>
                <button
                  className="text-button"
                  onClick={() => go("Calculadoras")}
                >
                  Explorar calculadoras <ArrowRight size={15} />
                </button>
              </div>
              <div className="calc-grid">
                {["Idade e crescimento", "TIG", "Índice de oxigenação"].map(
                  (c, i) => (
                    <button
                      className="calc-tile"
                      onClick={() => openCalc(c)}
                      key={c}
                    >
                      {i === 0 ? <Clock /> : i === 1 ? <Droplets /> : <Wind />}
                      <div>
                        <b>{c}</b>
                        <small>
                          {
                            [
                              "Idades corrigida e pós-menstrual",
                              "Taxa de infusão de glicose",
                              "Cálculo com amostra arterial",
                            ][i]
                          }
                        </small>
                      </div>
                      <ArrowUpRight size={17} />
                    </button>
                  ),
                )}
              </div>
            </>
          )}
          {section === "Pacientes" && (
            <>
              <div className="toolbar">
                <label className="search">
                  <Search size={18} />
                  <input
                    placeholder="Buscar código ou diagnóstico"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <button
                  className="subtle"
                  onClick={() => setArchived(!archived)}
                >
                  {archived ? "Ver ativos" : "Ver arquivados"}
                </button>
              </div>
              <div className="patient-grid">
                {state.patients
                  .filter(
                    (p) =>
                      p.archived === archived &&
                      `${p.id} ${p.diagnosis}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                  )
                  .map((patient) => (
                    <div className="card patient-card" key={patient.id}>
                      <div className="card-heading">
                        <span className="patient-avatar">
                          <Users />
                        </span>
                        <span className="tag">
                          {patient.archived ? "Arquivado" : "Em acompanhamento"}
                        </span>
                      </div>
                      <h2>{patient.id}</h2>
                      <p>{patient.diagnosis}</p>
                      <div className="mini-stats">
                        <span>
                          IG{" "}
                          <b>
                            {patient.weeks}s {patient.days}d
                          </b>
                        </span>
                        <span>
                          Peso <b>{patient.weight} g</b>
                        </span>
                        <span>
                          Suporte <b>{patient.vents.at(-1)?.mode || "—"}</b>
                        </span>
                      </div>
                      <button
                        className="primary full"
                        onClick={() => {
                          setActive(patient.id);
                          go("Visão geral");
                        }}
                      >
                        Abrir acompanhamento <ArrowRight size={16} />
                      </button>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() =>
                          commit(
                            (s) => archivePatient(s, patient.id),
                            `${patient.id}: ${patient.archived ? "reativado" : "arquivado"}`,
                          ).catch((e) => setNotice(e.message))
                        }
                      >
                        {patient.archived ? "Reativar" : "Encerrar e arquivar"}
                      </button>
                      <button
                        className="text-button danger"
                        onClick={() => {
                          setActive(patient.id);
                          setModal("delete");
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  ))}
              </div>
            </>
          )}
          {section === "Gasometrias" && p && (
            <>
              <div className="toolbar">
                <h2>
                  Registros de gasometria{" "}
                  <span className="count">{p.gases.length}</span>
                </h2>
                <button className="primary" onClick={() => setModal("gas")}>
                  <Plus size={16} /> Nova gasometria
                </button>
              </div>
              <div className="card">
                <p className="muted">
                  Selecione duas ou mais coletas para comparar. PO₂ venosa e
                  capilar não equivalem à PaO₂ arterial.
                </p>
                <GasTable
                  gases={[...p.gases].reverse()}
                  selected={selected}
                  onSelect={(id) =>
                    setSelected(
                      selected.includes(id)
                        ? selected.filter((x) => x !== id)
                        : [...selected, id],
                    )
                  }
                />
                {selected.length >= 2 && (
                  <div className="comparison">
                    <h3>Comparação cronológica</h3>
                    {p.gases
                      .filter((g) => selected.includes(g.id))
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map((g, i, arr) => (
                        <p key={g.id}>
                          {stamp(g.time)} · {g.sample} · pH {g.ph}{" "}
                          {i > 0
                            ? `(Δ ${(g.ph - arr[i - 1].ph).toFixed(2)}) · PCO₂ Δ ${(g.co2 - arr[i - 1].co2).toFixed(1)} mmHg`
                            : ""}
                        </p>
                      ))}
                    <small>
                      pH é logarítmico: variação percentual não apresentada.
                      Amostras diferentes exigem interpretação contextual.
                    </small>
                  </div>
                )}
              </div>
              <div className="card chart-card spacious">
                <div className="chart-tabs">
                  {(["ph", "co2", "hco3", "be", "lactate"] as const).map(
                    (m) => (
                      <button
                        onClick={() => setMetric(m)}
                        className={metric === m ? "selected" : ""}
                        key={m}
                      >
                        {m.toUpperCase()}
                      </button>
                    ),
                  )}
                </div>
                <Chart gases={p.gases} metric={metric} />
              </div>
            </>
          )}
          {section === "Ventilação" && p && (
            <>
              <div className="toolbar">
                <h2>Histórico de suporte respiratório</h2>
                <button className="primary" onClick={() => setModal("vent")}>
                  <Plus size={16} /> Registrar ajuste
                </button>
              </div>
              <div className="card">
                <p className="muted">
                  MAP/PAM aqui significa pressão média de vias aéreas (cmH₂O).
                  Associação temporal não estabelece causalidade.
                </p>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Data e hora</th>
                        <th>Modalidade</th>
                        <th>FiO₂</th>
                        <th>PIP</th>
                        <th>PEEP</th>
                        <th>MAP vias aéreas</th>
                        <th>FR programada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.vents.map((v, i) => (
                        <React.Fragment key={v.id}>
                          <tr>
                            <td>{stamp(v.time)}</td>
                            <td>
                              <b>{v.mode}</b>
                            </td>
                            <td>
                              {v.fio2}%{" "}
                              {i > 0 && (
                                <small>Δ {v.fio2 - p.vents[i - 1].fio2}</small>
                              )}
                            </td>
                            <td>{v.pip ?? "—"}</td>
                            <td>{v.peep}</td>
                            <td>{v.map ?? "—"}</td>
                            <td>{v.rate ?? "—"}</td>
                          </tr>
                          <tr>
                            <td colSpan={7} className="reason">
                              Motivo: {v.reason} · Pressões em cmH₂O; FR em irpm
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="card spacious">
                <h2>Coletas e parâmetros associados</h2>
                {p.gases.map((g) => (
                  <p key={g.id}>
                    {stamp(g.time)} · pH {g.ph} ·{" "}
                    {g.vent
                      ? `${g.vent.mode}, FiO₂ ${g.vent.fio2}%, PEEP ${g.vent.peep} cmH₂O`
                      : "Parâmetros não registrados no momento da coleta"}
                  </p>
                ))}
              </div>
            </>
          )}
          {(section === "Calculadoras" ||
            section === "Hidratação e Nutrição") && (
            <>
              <div className="calc-grid large">
                {[
                  "Idade e crescimento",
                  "TIG",
                  "Índice de oxigenação",
                  "Volume e infusão",
                ].map((c) => (
                  <button
                    className="calc-tile"
                    key={c}
                    onClick={() => openCalc(c)}
                  >
                    <Calculator />
                    <div>
                      <b>{c}</b>
                      <small>Ver fórmula, unidades e limites</small>
                    </div>
                    <ArrowUpRight size={18} />
                  </button>
                ))}
              </div>
              <div className="card spacious">
                <BookOpen />
                <h2>Transparência em cada resultado</h2>
                <p>
                  Fórmulas matemáticas testadas. Validação clínica externa
                  pendente. Necessidades hídricas, eletrólitos, nutrição
                  parenteral e curvas PIG/AIG/GIG dependem de referências e
                  protocolos validados antes da ativação.
                </p>
                <p className="muted">
                  Um resultado matemático não constitui uma prescrição
                  individualizada.
                </p>
              </div>
            </>
          )}
          {section === "Medicações" && (
            <div className="card empty-state">
              <Pill size={40} />
              <span className="tag">Aguardando validação farmacológica</span>
              <h2>Segurança antes de cada dose.</h2>
              <p>
                O catálogo neonatal precisa de apresentações, compatibilidades,
                doses e limites aprovados por uma equipe clínica e pelo
                protocolo institucional.
              </p>
              <p>
                Nenhuma dose ou diluição está disponível nesta versão.
                Medicamentos de alto risco exigirão dupla conferência humana.
              </p>
              <button className="subtle" onClick={() => go("Calculadoras")}>
                Acessar calculadoras disponíveis <ArrowRight size={16} />
              </button>
            </div>
          )}
          {section === "Histórico" && p && (
            <div className="card">
              <h2>Histórico de {p.id}</h2>
              <Timeline p={p} limit={Infinity} />
              <h3>Trilha de alterações</h3>
              {state.audit
                .filter((a) => a.text.startsWith(p.id + ":"))
                .reverse()
                .map((a, i) => (
                  <p className="audit" key={i}>
                    {stamp(a.time)} — {a.text}
                  </p>
                ))}
              <p className="muted">
                Trilha local para rastreabilidade; não é um registro inviolável
                nem substitui o prontuário oficial.
              </p>
            </div>
          )}
          {section === "Configurações" && (
            <div className="settings-grid">
              <div className="card">
                <ShieldCheck className="teal" />
                <h2>Proteção neste dispositivo</h2>
                <p>
                  {secure
                    ? "Cofre desbloqueado. Registros salvos com criptografia autenticada AES-GCM."
                    : "A demonstração fica apenas na memória. Ative um cofre com senha para preservar seus registros."}
                </p>
                <button className="primary" onClick={() => setModal("vault")}>
                  <Lock size={16} />
                  {secure ? "Abrir cofre" : "Configurar / abrir cofre"}
                </button>
                {secure && (
                  <button className="subtle" onClick={lock}>
                    Bloquear agora
                  </button>
                )}
                <p className="muted">
                  Senha mantida apenas na memória durante o desbloqueio, nunca
                  persistida. Derivação PBKDF2-SHA256 (600.000 iterações).
                  Bloqueio em 5 minutos. Sem sincronização de dados clínicos em
                  nuvem.
                </p>
              </div>
              <div className="card">
                <Download className="teal" />
                <h2>Backup e recuperação</h2>
                <p>
                  Exporte uma cópia criptografada, protegida pela senha do
                  cofre.
                </p>
                <button className="subtle" onClick={backup}>
                  <Download size={16} /> Exportar backup protegido
                </button>
                <label className="file-button">
                  Importar backup
                  <input
                    type="file"
                    accept="application/json"
                    onChange={importFile}
                  />
                </label>
                <p className="muted">
                  Importação usa a senha do cofre atual. Dados do navegador
                  podem ser removidos pelo sistema ou pelo usuário; mantenha
                  backups. Senha perdida não pode ser recuperada.
                </p>
                <button className="text-button" onClick={persist}>
                  Solicitar persistência ao navegador
                </button>
              </div>
              <div className="card">
                <BookOpen className="teal" />
                <h2>Versão e validação</h2>
                <p>NeoCalc Pro 0.1.1 · PWA · Fase 1 e NeoMonitor inicial.</p>
                <p>
                  Não validado para uso assistencial. Não substitui julgamento
                  clínico, monitorização, protocolos institucionais ou
                  prontuário eletrônico.
                </p>
                <p>
                  Referência de classificação: OMS, <i>Preterm birth</i>, 2023.
                  As fórmulas exibidas são relações matemáticas; não determinam
                  metas terapêuticas.
                </p>
              </div>
              <div className="card">
                <Download className="teal" />
                <h2>Instalar o aplicativo</h2>
                <p>
                  Instalação e funcionamento offline não verificados em
                  dispositivos reais nesta auditoria. Android / Chrome: menu →
                  Instalar aplicativo. iPhone / Safari: Compartilhar → Adicionar
                  à Tela de Início. Computador: ícone de instalação na barra de
                  endereços.
                </p>
                <p className="muted">
                  Abra o app com conexão uma vez para carregar os recursos. A
                  instalação e o uso offline dependem das políticas do navegador
                  e da hospedagem.
                </p>
              </div>
            </div>
          )}
          {!p &&
            ["Visão geral", "Gasometrias", "Ventilação", "Histórico"].includes(
              section,
            ) && (
              <div className="card empty-state">
                <Users />
                <h2>Comece um acompanhamento</h2>
                <button className="primary" onClick={() => setModal("patient")}>
                  Cadastrar paciente
                </button>
              </div>
            )}
          <footer>
            <span>
              <ShieldCheck size={14} /> Dados locais. Cuidado responsável.
            </span>
            <span>
              NeoCalc Pro <b>v0.1.1</b> <i /> Apoio à decisão profissional
            </span>
          </footer>
        </main>
      </div>
      {modal && (
        <div className="modal-backdrop">
          <div
            ref={modalRef}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={modal === "calc" ? calc : "Registro NeoMonitor"}
          >
            <button
              className="close icon-btn"
              aria-label="Fechar"
              disabled={busy}
              onClick={() => setModal("")}
            >
              <X />
            </button>
            {modal === "vault" ? (
              <>
                <h2>{secure ? "Abrir cofre" : "Proteja seus registros"}</h2>
                <p>
                  Senha de pelo menos 12 caracteres. Um cofre existente será
                  aberto com a sua senha; um novo cofre salvará os dados desta
                  sessão.
                </p>
                <form onSubmit={vault}>
                  <Field
                    label="Senha do cofre"
                    name="password"
                    type="password"
                  />
                  <button className="primary" disabled={busy}>
                    Configurar / desbloquear
                  </button>
                </form>
              </>
            ) : modal === "delete" ? (
              <>
                <h2>Excluir {p?.id}?</h2>
                <p>
                  A exclusão lógica remove os dados e detalhes de alterações
                  deste paciente do cofre, mantendo um evento de exclusão. Não
                  garante apagamento físico. Backups exportados precisam ser
                  excluídos separadamente. Digite o código para confirmar.
                </p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const code = String(
                      new FormData(e.currentTarget).get("code"),
                    );
                    try {
                      await commit(
                        (s) => deletePatient(s, p.id, code),
                        `${p.id}: registros excluídos`,
                      );
                      drafts.current = {};
                      setSelected([]);
                      setModal("");
                    } catch (e) {
                      setNotice((e as Error).message);
                    }
                  }}
                >
                  <Field label="Código do paciente" name="code" type="text" />
                  <button className="primary danger-bg" disabled={busy}>
                    Excluir do cofre
                  </button>
                </form>
              </>
            ) : modal === "calc" ? (
              <>
                <div className="eyebrow">
                  CALCULADORA · VALIDAÇÃO CLÍNICA PENDENTE
                </div>
                <h2>{calc}</h2>
                <form
                  onChange={() => setResult("")}
                  onSubmit={(e) => {
                    e.preventDefault();
                    setResult("");
                    const f = new FormData(e.currentTarget);
                    try {
                      if (calc === "TIG")
                        setResult(
                          `${tig(num(f, "concentration"), num(f, "rate"), num(f, "weight")).toFixed(3)} mg/kg/min`,
                        );
                      if (calc === "Idade e crescimento") {
                        const a = ages(
                          num(f, "weeks"),
                          num(f, "days"),
                          num(f, "post"),
                        );
                        setResult(
                          `IPM: ${formatAge(a.pma)} · Idade corrigida: ${formatAge(a.corrected)} · ${a.category}`,
                        );
                      }
                      if (calc === "Índice de oxigenação")
                        setResult(
                          `IO = ${oxygenIndex(num(f, "fio2"), num(f, "map"), num(f, "o2"), String(f.get("sample"))).toFixed(2)}`,
                        );
                      if (calc === "Volume e infusão")
                        setResult(
                          `${infusionRate(num(f, "volume"), num(f, "hours")).toFixed(2)} mL/h`,
                        );
                    } catch (err) {
                      setNotice((err as Error).message);
                    }
                  }}
                >
                  <div className="form-grid">
                    {calc === "TIG" ? (
                      <>
                        <Field
                          name="weight"
                          label="Peso (kg)"
                          value={p ? p.weight / 1000 : undefined}
                          min={0.1}
                        />
                        <Field
                          name="concentration"
                          label="Glicose (%)"
                          min={0}
                          max={100}
                        />
                        <Field name="rate" label="Infusão (mL/h)" min={0} />
                      </>
                    ) : calc === "Idade e crescimento" ? (
                      <>
                        <Field
                          name="weeks"
                          label="IG ao nascer (semanas)"
                          value={p?.weeks}
                          min={22}
                          max={44}
                          step="1"
                        />
                        <Field
                          name="days"
                          label="Dias adicionais da IG"
                          value={p?.days}
                          min={0}
                          max={6}
                          step="1"
                        />
                        <Field
                          name="post"
                          label="Idade pós-natal (dias completos)"
                          value={post}
                          min={0}
                          step="1"
                        />
                      </>
                    ) : calc === "Índice de oxigenação" ? (
                      <>
                        <Field
                          name="fio2"
                          label="FiO₂ (%)"
                          min={21}
                          max={100}
                        />
                        <Field
                          name="map"
                          label="MAP de vias aéreas (cmH₂O)"
                          min={0.1}
                        />
                        <Field name="o2" label="PaO₂ arterial (mmHg)" min={1} />
                        <label>
                          Amostra
                          <select name="sample">
                            <option>Arterial</option>
                            <option>Venosa</option>
                            <option>Capilar</option>
                          </select>
                        </label>
                      </>
                    ) : (
                      <>
                        <Field
                          name="volume"
                          label="Volume prescrito (mL)"
                          min={0}
                        />
                        <Field
                          name="hours"
                          label="Duração (horas)"
                          min={0.01}
                        />
                      </>
                    )}
                  </div>
                  <button className="primary">
                    Calcular <ArrowRight size={16} />
                  </button>
                </form>
                {result && <output className="result">{result}</output>}
                <div className="formula">
                  <h3>Fórmula e aplicabilidade</h3>
                  <p>
                    {calc === "TIG"
                      ? "TIG = glicose (%) × 10 × taxa (mL/h) ÷ [peso (kg) × 60]. A concentração percentual representa g/100 mL. Some separadamente a contribuição de todas as infusões."
                      : calc === "Idade e crescimento"
                        ? "IPM (dias) = IG ao nascer × 7 + dias adicionais + idade pós-natal. Idade corrigida = IPM − 280 dias. Valores negativos indicam tempo até 40 semanas. Classificação pela IG ao nascimento."
                        : calc === "Índice de oxigenação"
                          ? "IO = FiO₂ (%) × pressão média de vias aéreas (cmH₂O) ÷ PaO₂ (mmHg). Use medidas contemporâneas. Não usar PO₂ venosa ou capilar."
                          : "Taxa (mL/h) = volume prescrito (mL) ÷ duração (h). Não estima necessidades hídricas nem constitui prescrição."}
                  </p>
                  <small>
                    {calc === "Idade e crescimento"
                      ? "Fonte: OMS, Preterm birth, 2023 (classificação). Convenção de idade corrigida: 40 semanas."
                      : "Fonte: análise dimensional das unidades; implementação matemática v1, 2026. Metas e decisões terapêuticas exigem protocolo validado."}{" "}
                    Testes automatizados de cálculo; revisão clínica
                    independente pendente.
                  </small>
                </div>
              </>
            ) : (
              <>
                <div className="eyebrow">
                  {modal === "patient"
                    ? "NOVO ACOMPANHAMENTO"
                    : p?.id + " · REGISTRO LOCAL"}
                </div>
                <h2>
                  {
                    {
                      patient: "Cadastrar paciente",
                      edit: "Dados do paciente",
                      gas: "Registrar gasometria",
                      vent: "Registrar ventilação",
                    }[modal]
                  }
                </h2>
                <p>
                  Use somente dados simulados nesta versão. Não inclua nome, CPF
                  ou número de prontuário.
                </p>
                <form
                  onChange={(e) => {
                    drafts.current[modal + active] = Object.fromEntries(
                      [...new FormData(e.currentTarget)].map(([k, v]) => [
                        k,
                        String(v),
                      ]),
                    );
                  }}
                  onSubmit={submit}
                >
                  <fieldset disabled={busy} className="record-fields">
                    <div className="form-grid">
                      {modal === "patient" ? (
                        <>
                          <Field
                            name="id"
                            label="Identificador pseudônimo"
                            type="text"
                            value={nextPatientId(state.patients)}
                          />
                          <Field
                            name="born"
                            label="Nascimento (hora local)"
                            type="datetime-local"
                          />
                          <Field
                            name="weeks"
                            label="IG (semanas)"
                            min={22}
                            max={44}
                            step="1"
                          />
                          <Field
                            name="days"
                            label="IG (dias adicionais)"
                            min={0}
                            max={6}
                            value={0}
                            step="1"
                          />
                          <Field
                            name="birthWeight"
                            label="Peso ao nascer (g)"
                            min={100}
                          />
                          <Field
                            name="weight"
                            label="Peso atual (g)"
                            min={100}
                          />
                        </>
                      ) : modal === "edit" ? (
                        <Field
                          name="weight"
                          label="Peso atual (g)"
                          value={p?.weight}
                          min={100}
                        />
                      ) : (
                        <Field
                          name="time"
                          label="Data e hora (local)"
                          type="datetime-local"
                          value={nowLocal()}
                        />
                      )}
                      {(modal === "patient" || modal === "edit") && (
                        <>
                          <label>
                            Diagnóstico principal
                            <select
                              name="diagnosis"
                              defaultValue={
                                modal === "edit" ? p?.diagnosis : undefined
                              }
                            >
                              {[
                                "Prematuridade",
                                "Síndrome do desconforto respiratório",
                                "Observação neonatal",
                                "Sepse neonatal",
                                "Outro diagnóstico",
                              ].map((d) => (
                                <option key={d}>{d}</option>
                              ))}
                            </select>
                          </label>
                          <label className="wide">
                            Observações
                            <textarea
                              name="notes"
                              defaultValue={modal === "edit" ? p?.notes : ""}
                            />
                          </label>
                        </>
                      )}
                      {modal === "gas" && (
                        <>
                          <label>
                            Tipo de amostra
                            <select name="sample">
                              <option>Arterial</option>
                              <option>Venosa</option>
                              <option>Capilar</option>
                            </select>
                          </label>
                          <Field
                            name="ph"
                            label="pH medido"
                            min={6}
                            max={8.5}
                          />
                          <Field
                            name="co2"
                            label="PCO₂ medida (mmHg)"
                            min={1}
                            max={250}
                          />
                          <Field
                            name="hco3"
                            label="HCO₃⁻ calculado (mmol/L)"
                            min={0}
                            max={100}
                          />
                          <Field
                            name="be"
                            label="BE calculado (mmol/L) · opcional"
                            min={-50}
                            max={50}
                            required={false}
                          />
                          <Field
                            name="lactate"
                            label="Lactato (mmol/L) · opcional"
                            min={0}
                            max={50}
                            required={false}
                          />
                          <Field
                            name="o2"
                            label="PO₂ medida (mmHg) · opcional"
                            min={1}
                            max={800}
                            required={false}
                          />
                          <label className="wide">
                            Observações
                            <textarea name="notes" />
                          </label>
                          <p className="wide muted">
                            Campos vazios permanecem ausentes. Parâmetros
                            ventilatórios anteriores à coleta serão associados
                            como cópia histórica.
                          </p>
                        </>
                      )}
                      {modal === "vent" && (
                        <>
                          <label>
                            Modalidade
                            <select name="mode">
                              {[
                                "CPAP",
                                "NIPPV",
                                "SIMV",
                                "A/C",
                                "SIMV + VG",
                                "VG/VTV",
                                "HFOV",
                                "Ar ambiente",
                                "Outra",
                              ].map((m) => (
                                <option key={m}>{m}</option>
                              ))}
                            </select>
                          </label>
                          <Field
                            name="fio2"
                            label="FiO₂ (%)"
                            value={vent?.fio2}
                            min={21}
                            max={100}
                          />
                          <Field
                            name="pip"
                            label="PIP (cmH₂O) · opcional"
                            min={0}
                            required={false}
                          />
                          <Field
                            name="peep"
                            label="PEEP (cmH₂O)"
                            value={vent?.peep}
                            min={0}
                          />
                          <Field
                            name="map"
                            label="MAP de vias aéreas (cmH₂O)"
                            min={0}
                            required={false}
                          />
                          <Field
                            name="rate"
                            label="FR programada (irpm) · opcional"
                            min={0}
                            required={false}
                          />
                          <label className="wide">
                            Motivo do ajuste
                            <textarea name="reason" required />
                          </label>
                          <p className="muted wide">
                            Registro básico. Parâmetros específicos de HFOV,
                            volumes e medidas avançadas ainda não estão
                            disponíveis.
                          </p>
                        </>
                      )}
                    </div>
                    <div className="form-actions">
                      <button
                        type="button"
                        className="subtle"
                        onClick={() => setModal("")}
                      >
                        Cancelar
                      </button>
                      <button className="primary" disabled={busy}>
                        <Check size={16} /> Salvar registro
                      </button>
                    </div>
                  </fieldset>
                </form>
              </>
            )}
          </div>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button aria-label="Dispensar" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
