import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, ArrowUpRight, BarChart3, BookOpen, ChevronDown, CircleAlert, CircleCheck, Coins, Gauge, Globe2, Landmark, Lightbulb, Menu, Play, RotateCcw, Shield, SlidersHorizontal, Sparkles, TrendingUp, Wallet, X } from "lucide-react";
import { COUNTRIES } from "@/data/countries";
import { CONFIG } from "@/engine/config";
import { createGameState } from "@/engine/init";
import { processTurn, updatePolicy } from "@/engine/turn";
import { getGameSummary } from "@/engine/summary";
import { serializeSave, parseSave } from "@/engine/save";
import type { CountryId, CountryDefinition, Decisions, GameState, MonthlyRecord, SpendingCategory, TaxType } from "@/engine/types";

const SAVE_KEY = "geopolitica-economica-save";
type Section = "overview" | "policy" | "research" | "reports";
type SaveNotice = "old-version" | "invalid" | null;

const navItems: { id: Section; label: string; icon: typeof Gauge; index: string }[] = [
  { id: "overview", label: "Panorama", icon: Gauge, index: "01" },
  { id: "policy", label: "Políticas", icon: SlidersHorizontal, index: "02" },
  { id: "research", label: "Pesquisa", icon: Lightbulb, index: "03" },
  { id: "reports", label: "Relatórios", icon: BookOpen, index: "04" },
];

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const taxLabels: Record<TaxType, string> = { income: "Imposto de renda", corporate: "Imposto corporativo", consumption: "Imposto sobre consumo" };
const spendingLabels: Record<SpendingCategory, string> = { health: "Saúde", education: "Educação", infrastructure: "Infraestrutura", defense: "Defesa", research: "Pesquisa", other: "Demais despesas" };
const indexLabels: Record<keyof GameState["current"]["indices"], string> = { education: "Educação", health: "Saúde", infrastructure: "Infraestrutura", technology: "Tecnologia", institutions: "Instituições" };

function pct(value: number, digits = 1) { return `${(value * 100).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`; }
function money(value: number, decimals = 0) { return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(value); }
function gdpLabel(value: number) { return `${money(value / 1_000_000, 2)} tri`; }
function dateLabel(state: GameState) { return `${monthNames[state.month - 1] ?? "Janeiro"} ${state.year}`; }
function difficultyTone(difficulty: CountryDefinition["difficulty"]) { return difficulty === "Acessível" ? "easy" : difficulty === "Moderado" ? "medium" : "hard"; }
function statusLabel(status: GameState["status"]) {
  return ({ playing: "Em curso", victory: "Potência global", default: "Inadimplência", "political-crisis": "Crise política", hyperinflation: "Hiperinflação" } as const)[status];
}

function Metric({ label, value, detail, tone, icon: Icon }: { label: string; value: string; detail?: string; tone?: "up" | "down" | "neutral"; icon?: typeof Activity }) {
  return <article className="metric-card" data-testid={`metric-${label.toLowerCase().replaceAll(" ", "-")}`}>
    <div className="metric-top"><span>{label}</span>{Icon && <Icon size={15} strokeWidth={1.7} />}</div>
    <strong className="mono">{value}</strong>
    {detail && <small className={tone === "up" ? "trend up" : tone === "down" ? "trend down" : "trend"}>{detail}</small>}
  </article>;
}

function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`pill ${className}`}>{children}</span>;
}

function CountryPicker({ onStart, saveNotice, onDismissSaveNotice }: { onStart: (id: CountryId) => void; saveNotice: SaveNotice; onDismissSaveNotice: () => void }) {
  const [selected, setSelected] = useState<CountryId>("brasil");
  const countries = Object.values(COUNTRIES);
  const chosen = COUNTRIES[selected];
  return <main className="selection-page paper-grid">
    <header className="selection-top">
      <BrandMark />
      <div className="selection-status"><span className="pulse-dot" /> SIMULADOR ESTRATÉGICO <span className="status-divider" /> 2026</div>
    </header>
    {saveNotice && <div className="save-warning selection-save-warning" role="alert" data-testid="status-save-warning">
      <CircleAlert size={19} /><div><strong>{saveNotice === "old-version" ? "Save de versão antiga — inicie um novo jogo" : "O salvamento local está inválido."}<span> A campanha não foi carregada. Escolha um país para iniciar uma nova.</span></strong></div><button onClick={onDismissSaveNotice} data-testid="button-dismiss-save-warning">Entendi <X size={15} /></button>
    </div>}
    <section className="selection-hero">
      <div className="eyebrow"><span className="eyebrow-line" /> SALA DE CONTROLE ECONÔMICO</div>
      <h1 className="display">O futuro de uma<br /><em>nação começa aqui.</em></h1>
      <p>Escolha um país. Enfrente restrições reais. Transforme decisões difíceis em poder duradouro.</p>
    </section>
    <div className="selection-layout">
      <section className="country-list" aria-label="Seleção de país">
        <div className="section-heading"><div><span className="kicker">01 / MANDATO</span><h2>Escolha seu desafio</h2></div><span className="country-count">06 PAÍSES</span></div>
        <div className="country-grid">
          {countries.map((country, i) => <button key={country.id} className={`country-option ${selected === country.id ? "selected" : ""}`} onClick={() => setSelected(country.id)} data-testid={`select-country-${country.id}`}>
            <span className="country-index">0{i + 1}</span>
            <span className="country-option-name">{country.name}</span>
            <span className={`difficulty ${difficultyTone(country.difficulty)}`}>{country.difficulty}</span>
            <span className="country-option-gdp mono">{gdpLabel(country.gdp)}</span>
            <span className="country-option-meta">PIB inicial</span>
            <span className="selector-mark">{selected === country.id ? <CircleCheck size={17} /> : <span />}</span>
          </button>)}
        </div>
      </section>
      <aside className="mandate-card">
        <div className="mandate-head"><span className="kicker">RESUMO DO MANDATO</span><Globe2 size={17} /></div>
        <div className="mandate-country display">{chosen.name}</div>
        <div className="mandate-difficulty"><span className={`difficulty ${difficultyTone(chosen.difficulty)}`}>{chosen.difficulty}</span><span>Índice de desafio</span></div>
        <div className="difficulty-meter"><i style={{ width: chosen.difficulty === "Acessível" ? "34%" : chosen.difficulty === "Moderado" ? "66%" : "94%" }} /></div>
        <div className="mandate-stats">
          <span>PIB inicial <b className="mono">{gdpLabel(chosen.gdp)}</b></span>
          <span>População <b className="mono">{money(chosen.population)} mi</b></span>
          <span>Desemprego <b className="mono">{pct(chosen.unemployment)}</b></span>
          <span>Inflação <b className="mono">{pct(chosen.inflation)}</b></span>
          <span>Classificação <b className="mono">{chosen.rating}</b></span>
        </div>
        <div className="mandate-rule" />
        <p className="mandate-note"><Shield size={15} /> Cada decisão terá um custo. O objetivo é prosperar sem perder estabilidade.</p>
        <button className="primary-button start-button" onClick={() => onStart(selected)} data-testid="button-start-campaign"><span>Assumir o mandato</span><Play size={15} fill="currentColor" /></button>
        <div className="seed-note">NOVA CAMPANHA <span className="mono">SEMENTE 2026</span></div>
      </aside>
    </div>
    <footer className="selection-footer"><span>GEOPOLÍTICA ECONÔMICA</span><span>UMA SIMULAÇÃO DE ESCOLHAS, NÃO DE MILAGRES.</span></footer>
  </main>;
}

function BrandMark() {
  return <div className="brand-mark"><div className="brand-emblem"><span>G</span><i /></div><div className="brand-wordmark"><b>GEOPOLÍTICA</b><small>ECONÔMICA</small></div></div>;
}

function Sparkline({ records, field, color = "var(--forest)" }: { records: MonthlyRecord[]; field: keyof MonthlyRecord; color?: string }) {
  if (records.length < 2) return <div className="chart-empty">A série histórica começa após o primeiro fechamento mensal.</div>;
  const values = records.map((record) => Number(record[field]));
  const min = Math.min(...values); const max = Math.max(...values); const spread = max - min || 1;
  const points = values.map((value, i) => `${(i / (values.length - 1)) * 100},${34 - ((value - min) / spread) * 26}`).join(" ");
  return <svg className="sparkline" viewBox="0 0 100 38" preserveAspectRatio="none" role="img" aria-label="Evolução mensal">
    <line x1="0" y1="36" x2="100" y2="36" className="chart-baseline" />
    <polyline points={points} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    <circle cx={points.split(" ").at(-1)?.split(",")[0]} cy={points.split(" ").at(-1)?.split(",")[1]} r="1.8" fill={color} />
  </svg>;
}

function App() {
  const [state, setState] = useState<GameState | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const result = parseSave(raw);
    return result.status === "valid" ? result.state : null;
  });
  const [saveNotice, setSaveNotice] = useState<SaveNotice>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const result = parseSave(raw);
    return result.status === "valid" ? null : result.status;
  });
  const [section, setSection] = useState<Section>("overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const summary = useMemo(() => state ? getGameSummary(state) : null, [state]);
  const country = state ? COUNTRIES[state.countryId] : null;

  useEffect(() => {
    if (state) window.localStorage.setItem(SAVE_KEY, serializeSave(state));
  }, [state]);

  function startCampaign(countryId: CountryId) {
    setState(createGameState(countryId, 2026));
    setSaveNotice(null);
    setSection("overview");
  }

  function patchPolicy(patch: Decisions) {
    setState((current) => current ? updatePolicy(current, patch) : current);
  }

  function closeMonth() {
    if (!state) return;
    const decisions: Decisions = {
      taxRates: state.policy.taxRates,
      spendingPct: state.policy.spendingPct,
      rateMode: state.policy.rateMode,
      manualInterestRate: state.policy.manualInterestRate,
      researchProjectId: state.policy.researchProjectId,
      fxIntervention: state.policy.fxIntervention,
    };
    setState(processTurn(state, decisions));
    setReportOpen(true);
  }

  function resetCampaign() {
    if (window.confirm("Encerrar esta campanha e escolher um novo país? O progresso local será apagado.")) {
      window.localStorage.removeItem(SAVE_KEY);
      setState(null);
      setSaveNotice(null);
      setReportOpen(false);
    }
  }

  function dismissSaveNotice() {
    window.localStorage.removeItem(SAVE_KEY);
    setSaveNotice(null);
  }

  if (!state || !country || !summary) return <CountryPicker onStart={startCampaign} saveNotice={saveNotice} onDismissSaveNotice={dismissSaveNotice} />;

  const activeTab = navItems.find((item) => item.id === section);
  return <div className="app-frame">
    <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
      <div className="sidebar-brand"><BrandMark /><button className="mobile-close icon-button" onClick={() => setMobileNav(false)} aria-label="Fechar navegação" data-testid="button-close-navigation"><X size={18} /></button></div>
      <div className="sidebar-country">
        <div className="country-seal">{country.name.slice(0, 1)}</div>
        <div><span className="sidebar-caption">GOVERNO DE</span><strong>{country.name}</strong></div>
        <ChevronDown size={14} />
      </div>
      <div className="sidebar-section-label">ESTRATÉGIA NACIONAL</div>
      <nav className="main-nav" aria-label="Navegação principal">
        {navItems.map(({ id, label, icon: Icon, index }) => <button key={id} className={`nav-item ${section === id ? "active" : ""}`} onClick={() => { setSection(id); setMobileNav(false); }} data-testid={`nav-${id}`}>
          <Icon size={17} strokeWidth={1.7} /><span>{label}</span><small>{index}</small>
        </button>)}
      </nav>
      <div className="sidebar-spacer" />
      <section className="sidebar-milestone">
        <div className="milestone-title"><Sparkles size={14} /> PRÓXIMO MARCO</div>
        <p>{summary.nextMilestone}</p>
        <div className="milestone-track"><i style={{ width: `${Math.max(0, Math.min(summary.victoryProgress, 100))}%` }} /></div>
        <small>{money(summary.victoryProgress)}% DO CAMINHO</small>
      </section>
      <div className="sidebar-foot">
        <div className="save-indicator"><span className="pulse-dot" /> PROGRESSO SALVO LOCALMENTE</div>
        <button className="reset-button" onClick={resetCampaign} data-testid="button-reset-campaign"><RotateCcw size={14} /> Nova campanha</button>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <button className="mobile-menu icon-button" onClick={() => setMobileNav(true)} aria-label="Abrir navegação" data-testid="button-open-navigation"><Menu size={19} /></button>
        <div className="breadcrumb"><span>GOVERNO</span><i>/</i><b>{activeTab?.label.toUpperCase()}</b></div>
        <div className="topbar-right"><Pill className="status-pill"><span className="status-dot" />{statusLabel(state.status)}</Pill><span className="top-date">{dateLabel(state)}</span></div>
      </header>
      <div className="page-content">
        {section === "overview" && <Overview state={state} country={country} summary={summary} onCloseMonth={closeMonth} />}
        {section === "policy" && <PolicyPage state={state} onPatch={patchPolicy} summary={summary} />}
        {section === "research" && <ResearchPage state={state} onPatch={patchPolicy} />}
        {section === "reports" && <ReportsPage state={state} summary={summary} />}
      </div>
      <footer className="app-footer"><span>GEOPOLÍTICA ECONÔMICA <i>·</i> CONTROLE NACIONAL</span><span>SIMULAÇÃO MENSAL <b className="mono">v1.0</b></span></footer>
    </main>
    {reportOpen && <MonthlyReport state={state} onClose={() => setReportOpen(false)} />}
  </div>;
}

function PageHeading({ eyebrow, title, copy, action }: { eyebrow: string; title: ReactNode; copy: string; action?: ReactNode }) {
  return <div className="page-heading enter"><div><span className="kicker">{eyebrow}</span><h1 className="display">{title}</h1><p>{copy}</p></div>{action}</div>;
}

function Overview({ state, country, summary, onCloseMonth }: { state: GameState; country: CountryDefinition; summary: ReturnType<typeof getGameSummary>; onCloseMonth: () => void }) {
  const economy = state.current;
  const report = state.report;
  return <div className="section-stack">
    <PageHeading eyebrow={`SALA DE CONTROLE / ${dateLabel(state).toUpperCase()}`} title={<>Uma nação em <em>movimento.</em></>} copy={`Acompanhe o pulso de ${country.name} e decida qual custo vale a pena assumir.`}
      action={<button className="primary-button close-month" onClick={onCloseMonth} disabled={state.status !== "playing"} data-testid="button-close-month"><span>{state.status === "playing" ? "Fechar mês" : "Campanha encerrada"}</span><ArrowUpRight size={16} /></button>} />
    <section className="hero-band enter enter-delay-1">
      <div className="hero-band-copy"><div className="hero-overline"><span className="live-dot" /> BOLETIM ECONÔMICO <i /> {dateLabel(state).toUpperCase()}</div>
        <h2 className="display">{state.status === "playing" ? "O equilíbrio é uma escolha." : statusLabel(state.status)}</h2>
        <p>{report[0] ?? "O mandato começou. Os indicadores estão sob pressão; políticas coerentes levam tempo para produzir efeitos."}</p>
      </div>
      <div className="hero-band-symbol"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="globe-core"><Globe2 size={41} strokeWidth={1} /></div><span>PAINEL<br />NACIONAL</span></div>
    </section>
    <div className="metric-grid">
      <Metric label="Produto interno bruto" value={`$ ${gdpLabel(economy.gdp)}`} detail={`${pct(economy.growth, 2)} crescimento anualizado`} tone={economy.growth >= 0 ? "up" : "down"} icon={TrendingUp} />
      <Metric label="Inflação" value={pct(economy.inflation)} detail={`Meta ${pct(economy.inflationTarget)} · ${economy.inflation > economy.inflationTarget ? "acima do alvo" : "próxima do alvo"}`} tone={economy.inflation > economy.inflationTarget ? "down" : "up"} icon={Activity} />
      <Metric label="Desemprego" value={pct(economy.unemployment)} detail={`Confiança ${pct(economy.confidence)}`} tone="neutral" icon={BarChart3} />
      <Metric label="Dívida / PIB" value={pct(economy.debtToGdp)} detail={`Nota ${economy.rating} · risco-país ${money(economy.riskSpread * 10000, 0)} pb`} tone={economy.debtToGdp > .8 ? "down" : "neutral"} icon={Landmark} />
    </div>
    <section className="indicator-strip" aria-label="Outros indicadores econômicos">
      <div><span>PIB per capita</span><b className="mono">$ {money(economy.gdpPerCapita)}</b></div>
      <div><span>Juros nominais</span><b className="mono">{pct(economy.interestRate)}</b></div>
      <div><span>Câmbio</span><b className="mono">{money(economy.exchangeRate, 2)} / US$</b></div>
      <div><span>Investimento / PIB</span><b className="mono">{pct(economy.investmentRate)}</b></div>
      <div><span>Reservas internacionais</span><b className="mono">$ {money(economy.reserves / 1000, 1)} bi</b></div>
      <div><span>Inadimplência</span><b className="mono">{pct(economy.npl)}</b></div>
    </section>
    <div className="dashboard-grid">
      <section className="panel history-panel">
        <div className="panel-head"><div><span className="kicker">TRAJETÓRIA ECONÔMICA</span><h3>O pulso da economia</h3></div><Pill>{state.history.length} MESES</Pill></div>
        <div className="chart-legend"><span><i className="legend-gdp" /> PIB</span><span><i className="legend-inflation" /> Inflação</span><span className="chart-unit">SÉRIE HISTÓRICA</span></div>
        <div className="chart-row"><div className="chart-label"><strong>{gdpLabel(economy.gdp)}</strong><span>PRODUTO INTERNO BRUTO</span></div><Sparkline records={state.history} field="gdp" /></div>
        <div className="chart-row"><div className="chart-label"><strong>{pct(economy.inflation)}</strong><span>INFLAÇÃO ANUAL</span></div><Sparkline records={state.history} field="inflation" color="var(--ochre)" /></div>
        <div className="history-foot"><span>INÍCIO DA CAMPANHA</span><span>AGORA · {dateLabel(state).toUpperCase()}</span></div>
      </section>
      <section className="panel fiscal-panel">
        <div className="panel-head"><div><span className="kicker">CONTAS PÚBLICAS</span><h3>Margem fiscal</h3></div><Wallet size={17} /></div>
        <div className="fiscal-main"><span>Saldo primário</span><b className="mono">$ {money(summary.fiscal.primaryBalance / 1000, 1)} bi</b></div>
        <div className="fiscal-bars">
          <FiscalBar label="Receita" amount={summary.fiscal.revenue} max={Math.max(summary.fiscal.revenue, summary.fiscal.expenditure)} tone="green" />
          <FiscalBar label="Despesa" amount={summary.fiscal.expenditure} max={Math.max(summary.fiscal.revenue, summary.fiscal.expenditure)} tone="gold" />
        </div>
        <div className="fiscal-detail"><span>Juros da dívida</span><b className="mono">$ {money(summary.fiscal.debtInterest / 1000, 1)} bi</b></div>
        <div className="fiscal-detail"><span>Déficit nominal</span><b className="mono">$ {money(summary.fiscal.nominalDeficit / 1000, 1)} bi</b></div>
        <p className="tradeoff-note"><Coins size={14} /> Toda expansão exige financiamento. Toda contenção cobra seu preço.</p>
      </section>
    </div>
    <div className="dashboard-grid lower-grid">
      <section className="panel indicators-panel">
        <div className="panel-head"><div><span className="kicker">CAPACIDADE DO ESTADO</span><h3>Indicadores nacionais</h3></div><span className="unit-label">ÍNDICE / 100</span></div>
        {(Object.keys(indexLabels) as (keyof typeof indexLabels)[]).map((key) => <div className="index-row" key={key}><span>{indexLabels[key]}</span><div className="index-track"><i style={{ width: `${economy.indices[key] * 100}%` }} /></div><b className="mono">{money(economy.indices[key] * 100, 0)}</b></div>)}
        <div className="social-row">{[
          ["Estabilidade", economy.stability], ["Bem-estar", economy.happiness], ["Desigualdade", economy.inequality],
        ].map(([label, value]) => <div key={String(label)}><span>{label}</span><b className="mono">{pct(Number(value), 0)}</b></div>)}</div>
      </section>
      <section className="panel events-panel">
        <div className="panel-head"><div><span className="kicker">CONTEXTO EM CURSO</span><h3>Eventos ativos</h3></div><Activity size={17} /></div>
        {state.activeEvents.length === 0 ? <div className="empty-event"><div className="empty-event-icon"><CircleCheck size={17} /></div><div><b>Sem choques extraordinários</b><p>O ambiente segue relativamente estável. A próxima decisão ainda é sua.</p></div></div> :
          <div className="event-list">{state.activeEvents.map((event) => <article className="event-item" key={event.id} data-testid={`event-${event.id}`}><div className="event-mark" /><div><div className="event-title">{event.title}<span>{event.monthsRemaining} MESES</span></div><p>{event.description}</p></div></article>)}</div>}
      </section>
    </div>
    <section className="panel sector-panel">
      <div className="panel-head"><div><span className="kicker">ESTRUTURA PRODUTIVA</span><h3>Setores da economia</h3></div><Globe2 size={17} /></div>
      <div className="sector-list">{summary.sectorOutputs.map((sector) => <div className="sector-row" key={sector.id} data-testid={`sector-${sector.id}`}>
        <span>{sector.label}</span><div className="sector-track"><i style={{ width: `${sector.share * 100}%` }} /></div><b className="mono">{pct(sector.share)}</b><small className="mono">$ {money(sector.output / 1000, 1)} bi</small>
      </div>)}</div>
    </section>
    <section className="report-strip">
      <div className="report-strip-mark"><BookOpen size={19} /></div><div><span className="kicker">ÚLTIMO RELATÓRIO</span><strong>{report[0] ?? "Nenhum fechamento mensal registrado."}</strong></div>
      <span className="report-date">{dateLabel(state)}</span>
    </section>
  </div>;
}

function FiscalBar({ label, amount, max, tone }: { label: string; amount: number; max: number; tone: "green" | "gold" }) {
  return <div className="fiscal-bar-line"><span>{label}</span><div><i className={tone} style={{ width: `${max === 0 ? 0 : (amount / max) * 100}%` }} /></div><b className="mono">$ {money(amount / 1000, 1)} bi</b></div>;
}

function PolicyPage({ state, onPatch, summary }: { state: GameState; onPatch: (patch: Decisions) => void; summary: ReturnType<typeof getGameSummary> }) {
  const taxes = Object.keys(taxLabels) as TaxType[];
  const spending = Object.keys(spendingLabels) as SpendingCategory[];
  return <div className="section-stack">
    <PageHeading eyebrow="02 / INSTRUMENTOS DE GOVERNO" title={<>Políticas com <em>consequências.</em></>} copy="Ajuste impostos, prioridades e juros. O orçamento não permite tudo ao mesmo tempo." />
    <div className="policy-summary">
      <div><span className="kicker">SALDO PRIMÁRIO ATUAL</span><b className="mono">$ {money(summary.fiscal.primaryBalance / 1000, 1)} bi</b><small>O espaço fiscal é finito — aumentar uma rubrica exige escolhas em outras.</small></div>
      <div className="policy-summary-divider" />
      <div><span className="kicker">TAXA DE JUROS</span><b className="mono">{pct(state.current.interestRate)}</b><small>{state.policy.rateMode === "auto" ? "Regime automático orientado pela economia." : "Definição manual pelo governo."}</small></div>
      <div className="policy-stamp"><SlidersHorizontal size={20} /><span>MANDATO<br />EM VIGOR</span></div>
    </div>
    <div className="policy-layout">
      <section className="panel policy-panel">
        <div className="panel-head"><div><span className="kicker">ARRECADAÇÃO</span><h3>Política tributária</h3></div><Coins size={17} /></div>
        <p className="panel-intro">Mais receita amplia a ação do Estado; alíquotas maiores reduzem renda disponível e podem desaquecer a atividade.</p>
        {taxes.map((key) => <SliderControl key={key} label={taxLabels[key]} value={state.policy.taxRates[key]} min={CONFIG.decisions.minimumTaxRate} max={CONFIG.fiscal.maximumRates[key]} step={0.005} display={pct(state.policy.taxRates[key])} onChange={(value) => onPatch({ taxRates: { [key]: value } })} testId={`policy-tax-${key}`} />)}
      </section>
      <section className="panel policy-panel">
        <div className="panel-head"><div><span className="kicker">ALOCAÇÃO DO PIB</span><h3>Gastos públicos</h3></div><Landmark size={17} /></div>
        <p className="panel-intro">Investimento social e infraestrutura constroem capacidade, mas aumentam a pressão sobre as contas públicas.</p>
        {spending.map((key) => <SliderControl key={key} label={spendingLabels[key]} value={state.policy.spendingPct[key]} min={CONFIG.decisions.minimumSpending} max={CONFIG.decisions.maximumSpendingCategory} step={0.0025} display={pct(state.policy.spendingPct[key])} onChange={(value) => onPatch({ spendingPct: { [key]: value } })} testId={`policy-spending-${key}`} />)}
      </section>
      <section className="panel monetary-panel">
        <div className="panel-head"><div><span className="kicker">POLÍTICA MONETÁRIA</span><h3>Juros & moeda</h3></div><Activity size={17} /></div>
        <div className="rate-mode-control">
          <div><strong>Regime de juros</strong><small>Como o banco central define a taxa-base.</small></div>
          <div className="segmented"><button className={state.policy.rateMode === "auto" ? "selected" : ""} onClick={() => onPatch({ rateMode: "auto" })} data-testid="button-rate-auto">Automático</button><button className={state.policy.rateMode === "manual" ? "selected" : ""} onClick={() => onPatch({ rateMode: "manual" })} data-testid="button-rate-manual">Manual</button></div>
        </div>
        {state.policy.rateMode === "manual" && <SliderControl label="Taxa nominal anual" value={state.policy.manualInterestRate} min={CONFIG.monetary.interestMinimum} max={CONFIG.monetary.interestMaximum} step={0.0025} display={pct(state.policy.manualInterestRate)} onChange={(value) => onPatch({ manualInterestRate: value })} testId="policy-manual-interest-rate" />}
        <div className="intervention-control">
          <div className="intervention-icon"><Globe2 size={18} /></div><div><strong>Intervenção cambial</strong><small>Usar reservas para suavizar oscilações do câmbio.</small></div>
          <button className={`switch ${state.policy.fxIntervention ? "on" : ""}`} role="switch" aria-checked={state.policy.fxIntervention} onClick={() => onPatch({ fxIntervention: !state.policy.fxIntervention })} data-testid="toggle-fx-intervention"><i /></button>
        </div>
        <div className="reserve-note"><span>Reservas internacionais</span><b className="mono">$ {money(state.current.reserves)} mi</b></div>
        <div className="rate-diagnostics">
          <div><span>Juro real esperado</span><b className="mono">{pct(state.current.realRate)}</b></div>
          <div><span>Sugestão da regra de Taylor</span><b className="mono">{pct(summary.taylorSuggestion)}</b></div>
        </div>
      </section>
    </div>
    <div className="policy-footnote"><CircleAlert size={15} /><span>Alterações são salvas localmente e entram no cálculo ao fechar o mês. Não há política sem trade-off.</span></div>
  </div>;
}

function SliderControl({ label, value, min, max, step, display, onChange, testId }: { label: string; value: number; min: number; max: number; step: number; display: string; onChange: (value: number) => void; testId: string }) {
  return <label className="slider-control"><span className="slider-label">{label}<b className="mono">{display}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} data-testid={testId} /><span className="slider-limits"><i>{pct(min, 0)}</i><i>{pct(max, 0)}</i></span></label>;
}

function researchEffectLabel(area: string): string {
  switch (area) {
    case "Econômica":
    case "Tecnológica":
      return "CRESCIMENTO POTENCIAL";
    case "Social":
      return "BEM-ESTAR";
    case "Militar":
      return "ESTABILIDADE";
    case "Governamental":
      return "INSTITUIÇÕES";
    default:
      return "BÔNUS";
  }
}

function ResearchPage({ state, onPatch }: { state: GameState; onPatch: (patch: Decisions) => void }) {
  const selected = state.policy.researchProjectId;
  return <div className="section-stack">
    <PageHeading eyebrow="03 / CAPACIDADE DE LONGO PRAZO" title={<>Investir no que ainda <em>não existe.</em></>} copy="Pesquisa leva tempo e consome recursos hoje. Seus retornos só aparecem quando a nação aprende." />
    <section className="research-wallet">
      <div className="research-wallet-icon"><Lightbulb size={20} /></div><div><span className="kicker">PONTOS DE PESQUISA DISPONÍVEIS</span><strong className="mono">{money(state.researchPoints, 1)} <small>RP</small></strong></div><div className="wallet-caption">Conhecimento é capital paciente.<br />Escolha uma frente por vez.</div>
    </section>
    {state.research.length === 0 ? <div className="panel empty-research"><Lightbulb size={21} /><h3>Sem projetos disponíveis</h3><p>Novos projetos aparecerão conforme a capacidade de pesquisa do país evoluir.</p></div> :
      <div className="research-list">{state.research.map((project, index) => <article key={project.id} className={`research-card ${selected === project.id ? "active" : ""}`} data-testid={`research-project-${project.id}`}>
        <div className="research-card-top"><span className="project-number">PROJETO / 0{index + 1}</span><Pill className={project.completed ? "complete-pill" : ""}>{project.completed ? "CONCLUÍDO" : project.area.toUpperCase()}</Pill></div>
        <div className="research-card-body"><div className="project-icon"><Lightbulb size={18} /></div><div className="project-copy"><h3>{project.name}</h3><p>{project.description}</p></div><div className="project-cost"><span>CUSTO</span><b className="mono">{money(project.cost)} RP</b></div></div>
        <div className="project-progress-row"><span>PROGRESSO</span><b className="mono">{pct(project.progress, 0)}</b></div><div className="project-progress"><i style={{ width: `${Math.max(0, Math.min(project.progress * 100, 100))}%` }} /></div>
        <div className="research-card-foot"><span><Sparkles size={14} /> {researchEffectLabel(project.area)} <b className="mono">+{pct(project.bonus, 1)}</b></span>
          {project.completed ? <span className="project-completed"><CircleCheck size={15} /> BENEFÍCIO ATIVO</span> : <button className={selected === project.id ? "secondary-button selected-project" : "secondary-button"} onClick={() => onPatch({ researchProjectId: selected === project.id ? null : project.id })} data-testid={`button-select-research-${project.id}`}>{selected === project.id ? "Remover prioridade" : "Priorizar projeto"}</button>}
        </div>
      </article>)}</div>}
    <div className="research-note"><CircleAlert size={15} /><span>Pesquisa compete com outras prioridades orçamentárias. Projetos priorizados avançam conforme o motor econômico da simulação.</span></div>
  </div>;
}

function ReportsPage({ state, summary }: { state: GameState; summary: ReturnType<typeof getGameSummary> }) {
  const records = [...state.history].reverse();
  return <div className="section-stack">
    <PageHeading eyebrow="04 / MEMÓRIA INSTITUCIONAL" title={<>Os números contam uma <em>história.</em></>} copy="Cada mês fechado registra as consequências das decisões e a direção em que o país está indo." />
    <div className="report-stats"><div><span>MESES TRANSCORRIDOS</span><b className="mono">{money(state.turn)}</b></div><div><span>PIB ATUAL</span><b className="mono">$ {gdpLabel(state.current.gdp)}</b></div><div><span>MARCO SEGUINTE</span><b>{summary.nextMilestone}</b></div></div>
    <section className="panel records-panel">
      <div className="panel-head"><div><span className="kicker">ARQUIVO DE GOVERNO</span><h3>Histórico mensal</h3></div><Pill>{records.length} REGISTROS</Pill></div>
      {records.length === 0 ? <div className="empty-records"><div className="empty-record-icon"><BookOpen size={19} /></div><b>O primeiro relatório ainda não foi escrito.</b><p>Feche o mês no panorama para registrar os primeiros resultados do mandato.</p></div> :
        <div className="table-wrap"><table><thead><tr><th>PERÍODO</th><th>PIB</th><th>CRESCIMENTO</th><th>INFLAÇÃO</th><th>DESEMPREGO</th><th>DÍVIDA / PIB</th><th>NOTA</th></tr></thead><tbody>{records.map((record) => <tr key={record.turn} data-testid={`row-month-${record.turn}`}><td>{record.label}</td><td className="mono">$ {gdpLabel(record.gdp)}</td><td className={`mono ${record.growth >= 0 ? "positive" : "negative"}`}>{pct(record.growth, 2)}</td><td className="mono">{pct(record.inflation)}</td><td className="mono">{pct(record.unemployment)}</td><td className="mono">{pct(record.debtToGdp)}</td><td><span className="rating-tag">{record.rating}</span></td></tr>)}</tbody></table></div>}
    </section>
    {state.report.length > 0 && <section className="panel latest-report"><div className="panel-head"><div><span className="kicker">ANÁLISE MAIS RECENTE</span><h3>{dateLabel(state)}</h3></div><BookOpen size={17} /></div><ReportBullets items={state.report} /></section>}
  </div>;
}

function ReportBullets({ items }: { items: string[] }) {
  return <div className="report-bullets">{items.map((item, index) => <div key={`${index}-${item}`}><span className="report-bullet">{String(index + 1).padStart(2, "0")}</span><p>{item}</p></div>)}</div>;
}

function MonthlyReport({ state, onClose }: { state: GameState; onClose: () => void }) {
  return <div className="modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="monthly-modal" role="dialog" aria-modal="true" aria-labelledby="report-title" data-testid="modal-monthly-report">
      <div className="modal-top"><span className="kicker">FECHAMENTO DO MÊS / {String(state.turn).padStart(2, "0")}</span><button className="icon-button modal-close" aria-label="Fechar relatório" onClick={onClose} data-testid="button-close-report"><X size={18} /></button></div>
      <div className="modal-mark"><BookOpen size={20} /></div><h2 className="display" id="report-title">Relatório de <em>{dateLabel(state)}.</em></h2>
      <p className="modal-lede">As contas foram fechadas. Eis o que mudou neste mês.</p>
      <ReportBullets items={state.report.length ? state.report : ["O período foi processado. Consulte os indicadores para acompanhar os efeitos das decisões."]} />
      <div className="modal-indicators"><div><span>PIB</span><b className="mono">$ {gdpLabel(state.current.gdp)}</b></div><div><span>INFLAÇÃO</span><b className="mono">{pct(state.current.inflation)}</b></div><div><span>CONFIANÇA</span><b className="mono">{pct(state.current.confidence)}</b></div><div><span>SITUAÇÃO</span><b>{statusLabel(state.status)}</b></div></div>
      <button className="primary-button modal-done" onClick={onClose} data-testid="button-acknowledge-report">Entendido <ArrowUpRight size={15} /></button>
    </section>
  </div>;
}

export default App;
