import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import StatusBadge from "../components/ui/StatusBadge";
import { bankAdmin, bankTransfer, type BankActionResult } from "../services/demo";
import { attackScenarios, scenarioCategories, type AttackScenario, type ScenarioFilter } from "./attackScenarios";

type FeedEvent = { id: string; timestamp: string; scenario: AttackScenario; result: BankActionResult & { severity?: string; risk_score?: number; incident_id?: string; event_id?: string } };
const targetIdentity = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

function severityClass(severity: string) { return `scenario-severity severity-${severity.toLowerCase()}`; }
function formatIdentity(value: string) { return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value; }

function AttackDemo() {
  const [filter, setFilter] = useState<ScenarioFilter>("All");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(attackScenarios[1].id);
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [running, setRunning] = useState("");
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<FeedEvent | null>(null);

  const visibleScenarios = useMemo(() => attackScenarios.filter((scenario) => {
    const matchesFilter = filter === "All" || (filter === "Critical" ? scenario.severity === "CRITICAL" : scenario.category === filter);
    const text = `${scenario.title} ${scenario.description} ${scenario.category}`.toLowerCase();
    return matchesFilter && text.includes(query.toLowerCase());
  }), [filter, query]);
  const selected = attackScenarios.find((scenario) => scenario.id === selectedId) ?? attackScenarios[0];

  async function executeScenario(scenario: AttackScenario) {
    setRunning(scenario.id); setError("");
    const requests = scenario.mode === "sequence" ? Array.from({ length: 7 }) : [undefined];
    const events: FeedEvent[] = [];
    try {
      for (let index = 0; index < requests.length; index += 1) {
        const request = { org_id: "acme-organization", did: targetIdentity, role: scenario.role, resource_id: scenario.resourceId, action: scenario.action };
        const result = scenario.endpoint === "transfer"
          ? await bankTransfer({ ...request, amount: scenario.severity === "CRITICAL" ? 9000 : 250, recipient: "Synthetic Restricted Destination" })
          : await bankAdmin(request);
        const event: FeedEvent = { id: `${scenario.id}-${index}-${Date.now()}`, timestamp: new Date().toISOString(), scenario, result: { ...result, severity: scenario.severity, risk_score: scenario.risk, event_id: `${scenario.id}-${index}`, incident_id: result.incident_id } };
        events.push(event);
        if (scenario.mode === "sequence") await new Promise((resolve) => window.setTimeout(resolve, 120));
      }
      setFeed((current) => [...events.reverse(), ...current]);
      setDetail(events[events.length - 1] ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The controlled simulation failed.");
    } finally { setRunning(""); }
  }

  return <div className="attack-shell"><header className="attack-header"><div className="attack-brand"><span className="attack-mark">!</span><div><strong>Controlled Attack Laboratory</strong><span>Synthetic client · fictional Acme Bank only</span></div></div><div className="attack-header-links"><Link to="/bank">Bank Target</Link><Link to="/security">TrustMesh Control Plane</Link></div></header><main className="attack-content attack-lab-content">
    <section className="attack-hero"><div><span className="side-eyebrow attack-eyebrow">ATTACK DEMO / SCENARIO LIBRARY</span><h1>Attack safely. Learn how defense responds.</h1><p>Choose a predefined scenario, review exactly what it will request, and launch synthetic activity through the protected Bank API. The attacker never makes the human security decision.</p></div><StatusBadge variant="warning">{`${attackScenarios.length} controlled scenarios`}</StatusBadge></section>
    <div className="attack-flow"><span>ATTACKER</span><b>→</b><span>ACME BANK</span><b>→</b><strong>TRUSTMESH CHECKPOINT</strong><b>→</b><span>DENY / AUDIT / INCIDENT</span></div>
    <section className="scenario-toolbar"><div className="scenario-filters">{scenarioCategories.map((category) => <button key={category} type="button" className={filter === category ? "active" : ""} onClick={() => setFilter(category)}>{category}</button>)}</div><input aria-label="Search scenarios" placeholder="Search scenarios..." value={query} onChange={(event) => setQuery(event.target.value)} /></section>
    <div className="attack-lab-grid"><section className="scenario-library"><div className="lab-section-heading"><div><span className="panel-kicker">SCENARIO LIBRARY</span><h2>Choose a controlled attack</h2></div><span>{visibleScenarios.length} shown</span></div><div className="scenario-list">{visibleScenarios.map((scenario) => <button type="button" className={`scenario-card ${selected.id === scenario.id ? "selected" : ""}`} key={scenario.id} onClick={() => setSelectedId(scenario.id)}><div className="scenario-card-top"><span className={severityClass(scenario.severity)}>{scenario.severity}</span><span className="scenario-category">{scenario.category}</span></div><strong>{scenario.title}</strong><p>{scenario.description}</p><div className="scenario-card-meta"><span>RISK <b>{scenario.risk}/100</b></span><span>{scenario.mode === "sequence" ? "7 REQUEST SEQUENCE" : "SINGLE REQUEST"}</span></div></button>)}</div></section>
      <aside className="scenario-inspector"><div className="lab-section-heading"><div><span className="panel-kicker">SELECTED SCENARIO</span><h2>Launch preview</h2></div><span className={severityClass(selected.severity)}>{selected.severity}</span></div><div className="inspector-title"><h3>{selected.title}</h3><p>{selected.description}</p></div><div className="inspector-facts"><span>ATTACK CATEGORY <b>{selected.category}</b></span><span>ATTACKER IDENTITY <b>{selected.identity} / {selected.role}</b></span><span>TARGET APPLICATION <b>{selected.target}</b></span><span>TARGET RESOURCE <b>{selected.resourceId}</b></span><span>TARGET ACTION <b>{selected.action}</b></span><span>REQUIRED PERMISSION <b>{selected.permission}</b></span><span>EXPECTED RESULT <b className="expect-deny">DENY + EVIDENCE</b></span><span>RISK SCORE <b>{selected.risk}/100</b></span></div><div className="inspector-warning">This launches {selected.mode === "sequence" ? "seven controlled requests" : "one controlled request"} through the existing protected Bank API. No external target is contacted.</div><button className="attack-primary launch-button" type="button" disabled={Boolean(running)} onClick={() => void executeScenario(selected)}>{running === selected.id ? "Running simulation..." : "Launch Simulation"}</button></aside></div>
    <section className="attack-evidence panel"><div className="lab-section-heading"><div><span className="panel-kicker">LIVE ATTACK FEED</span><h2>Observed evidence</h2></div><StatusBadge>{feed.length ? `${feed.length} events` : "Standby"}</StatusBadge></div>{error && <div className="attack-error" role="alert">{error}</div>}{feed.length ? <div className="rich-feed">{feed.map((event) => <button type="button" className="rich-feed-row" key={event.id} onClick={() => setDetail(event)}><span className={severityClass(event.scenario.severity)}>{event.scenario.severity}</span><time>{new Date(event.timestamp).toLocaleTimeString()}</time><strong>{event.scenario.title}</strong><span>{event.scenario.category}</span><b>DENY</b><small>{formatIdentity(event.result.identity)} → {event.scenario.target} · {event.scenario.action} · risk {event.result.risk_score}/100</small></button>)}</div> : <div className="attack-empty">Select a scenario and launch it to stream timestamped checkpoint evidence here.</div>}</section>
    {detail && <section className="evidence-detail panel"><div className="lab-section-heading"><div><span className="panel-kicker">EVENT INSPECTOR</span><h2>{detail.scenario.title}</h2></div><button className="close-detail" type="button" onClick={() => setDetail(null)}>Close</button></div><div className="evidence-grid"><span>TIMESTAMP <b>{new Date(detail.timestamp).toLocaleString()}</b></span><span>REQUEST ID <b>{detail.result.event_id ?? detail.id}</b></span><span>CHECKPOINT <b>TrustMesh policy + behavior</b></span><span>DECISION <b className="expect-deny">{detail.result.allowed ? "ALLOW" : "DENY"}</b></span><span>FINDING <b>{detail.result.severity ?? detail.scenario.severity}</b></span><span>INCIDENT <b>{detail.result.incident_id ?? "Created by security workflow"}</b></span></div></section>}
    <section className="attack-next"><div><span className="side-eyebrow">HUMAN RESPONSE HAPPENS IN TRUSTMESH</span><h2>Evidence first. Defender decision second.</h2><p>Attack Demo can generate evidence only. Review incidents in Security Center and choose Accept, Suspend, or Block there.</p></div><Link className="attack-control-link" to="/security">Open Security Center →</Link></section>
  </main></div>;
}

export default AttackDemo;
