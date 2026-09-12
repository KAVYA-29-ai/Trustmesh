import { useEffect, useMemo, useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import StatusBadge from "../components/ui/StatusBadge";
import Icon from "../components/ui/Icon";
import {
  getSecurityCenter,
  getSecurityFindings,
  getWorkflowGraph,
  getSecurityIncidents,
  getSecurityCopilot,
  decideSecurityIncident,
} from "../services/security";
import type {
  SecurityEvent,
  SecurityFinding,
  SecuritySummary,
  RiskGraphResponse,
  SecurityIncident,
  SecurityCopilotResponse,
} from "../types/api";

function severityClass(severity: string): string {
  return `security-severity security-severity-${severity.toLowerCase()}`;
}

function shortIdentity(value: string): string {
  return value.length > 18 ? `${value.slice(0, 9)}...${value.slice(-6)}` : value;
}

function SecurityMetric({ label, value, detail, tone = "neutral" }: { label: string; value: string | number; detail: string; tone?: string }) {
  return <article className={`security-metric security-metric-${tone}`}><span className="security-metric-label">{label}</span><strong>{value}</strong><span>{detail}</span></article>;
}

function AttackTimeMetric({
  incident,
}: {
  incident: SecurityIncident | null;
}) {
  if (!incident) {
    return (
      <SecurityMetric
        label="ATTACK-TIME"
        value="—"
        detail="Awaiting incident evidence"
        tone="neutral"
      />
    );
  }

  const latency =
    incident.response_metrics?.attack_to_restriction_ms ?? 0;

  return (
    <SecurityMetric
      label="ATTACK-TIME"
      value={`${latency} ms`}
      detail={
        incident.suspended
          ? "Attack to suspension"
          : "Attack to adaptive restriction"
      }
      tone={latency <= 100 ? "success" : "warning"}
    />
  );
}

function BehavioralAnalysis({ incident }: { incident: SecurityIncident | null }) {
  if (!incident) {
    return <div className="behavior-empty"><Icon name="database" /><div><strong>Behavioral baseline awaiting evidence</strong><span>Run the controlled Acme simulation to correlate requests, violations, and adaptive response.</span></div></div>;
  }

  const signals = [
    ["REQUEST PATTERN", `${incident.violations} denied request${incident.violations === 1 ? "" : "s"}`, "Repeated policy failures"],
    ["RESOURCE TARGET", incident.resource, "Administrative resource attempt"],
    ["ACCESS SEQUENCE", incident.attack_type, "Observed in incident evidence"],
    ["RISK RESPONSE", `${incident.risk_score}/100`, incident.suspended ? "Identity suspended" : "Adaptive restriction applied"],
  ];

  return <div className="behavior-analysis"><div className="behavior-stage behavior-stage-normal"><span className="behavior-stage-index">01</span><div><strong>Normal baseline</strong><span>Expected role and resource usage</span></div></div><div className="behavior-connector" aria-hidden="true" /><div className="behavior-stage behavior-stage-anomaly"><span className="behavior-stage-index">02</span><div><strong>Anomalous behavior</strong><span>Repeated denied requests and privilege probing</span></div></div><div className="behavior-connector" aria-hidden="true" /><div className="behavior-stage behavior-stage-threat"><span className="behavior-stage-index">03</span><div><strong>Threat pattern</strong><span>Risk escalation with adaptive response</span></div></div><div className="behavior-signals">{signals.map(([label, value, detail]) => <div className="behavior-signal" key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>)}</div></div>;
}

function TrustGraph({ graph }: { graph: RiskGraphResponse | null }) {
  if (!graph || graph.nodes.length === 0) {
    return <div className="resource-empty graph-empty"><div className="security-state-icon"><Icon name="resource" /></div><h3>No relationship evidence yet</h3><p>The graph will populate as TrustMesh records identity and security telemetry.</p></div>;
  }

  const groups = ["identity", "role", "permission", "resource", "event", "threat"];
  const nodesByType = groups.map((type) => ({ type, nodes: graph.nodes.filter((node) => node.type === type).slice(0, 4) })).filter((group) => group.nodes.length > 0);

  return <div className="trust-graph"><div className="trust-graph-core"><span>TRUST / RISK</span><strong>Identity context</strong><small>{graph.count.links} evidence-backed relationships</small></div><div className="trust-graph-branches">{nodesByType.map((group) => <div className={`trust-graph-group trust-graph-${group.type}`} key={group.type}><span className="trust-graph-group-label">{group.type}</span>{group.nodes.map((node) => <div className="trust-graph-node" key={node.id}><strong>{shortIdentity(node.label)}</strong>{node.risk > 0 && <small>Risk {node.risk}</small>}</div>)}</div>)}</div><div className="trust-graph-note"><span>Identity → role → permission → resource</span><span>Identity → violations → risk → restriction</span></div></div>;
}

function IncidentPipeline({ incident }: { incident: SecurityIncident | null }) {
  if (!incident) return <div className="pipeline-empty">No active incident pipeline. Controlled simulation evidence will appear here.</div>;
  return <div className="incident-pipeline">{incident.timeline.map((stage, index) => <div className="pipeline-stage" key={`${stage.stage}-${stage.timestamp}`}><span className="pipeline-stage-index">{String(index + 1).padStart(2, "0")}</span><strong>{stage.stage.replaceAll("_", " ")}</strong>{index < incident.timeline.length - 1 && <span className="pipeline-arrow" aria-hidden="true">→</span>}</div>)}<div className="pipeline-stage pipeline-stage-final"><span className="pipeline-stage-index">!</span><strong>ADMIN ALERT</strong></div></div>;
}

function IncidentQueue({
  incidents,
  selectedId,
  onSelect,
}: {
  incidents: SecurityIncident[];
  selectedId: string | null;
  onSelect: (incidentId: string) => void;
}) {
  if (incidents.length === 0) {
    return <div className="resource-empty"><div className="security-state-icon"><Icon name="check" /></div><h3>No workflow incidents</h3><p>Launch a controlled scenario from Attack Demo to create evidence.</p></div>;
  }

  return <div className="incident-queue">{incidents.map((incident) => { const queueState = incident.decision === "ACCEPT" ? "ACCEPTED" : (incident.status ?? (incident.suspended ? "SUSPENDED" : "OPEN")); return <button type="button" className={`incident-queue-row ${selectedId === incident.incident_id ? "selected" : ""}`} key={incident.incident_id} onClick={() => onSelect(incident.incident_id)}><span className={severityClass(incident.severity)}>{incident.severity}</span><div><strong>{incident.attack_type}</strong><small>{incident.identity} · {incident.resource}</small></div><b>{incident.risk_score}/100</b><span className={`incident-state incident-state-${queueState.toLowerCase()}`}>{queueState}</span></button>; })}</div>;
}

function Security() {
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [riskGraph, setRiskGraph] = useState<RiskGraphResponse | null>(null);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [copilot, setCopilot] = useState<SecurityCopilotResponse | null>(null);
  const [decisionLoading, setDecisionLoading] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const latestIncident = incidents[0] ?? null;
  const selectedIncident = incidents.find((incident) => incident.incident_id === selectedIncidentId) ?? latestIncident;

  async function decideIncident(decision: "ACCEPT" | "SUSPEND" | "BLOCK") {
    if (!selectedIncident || !window.confirm(`Confirm ${decision} for ${selectedIncident.identity}?`)) return;
    setDecisionLoading(decision);
    setDecisionError("");
    try {
      await decideSecurityIncident(selectedIncident.incident_id, decision);
      const response = await getSecurityIncidents();
      setIncidents(response.incidents);
    } catch (requestError) {
      setDecisionError(requestError instanceof Error ? requestError.message : "Unable to record the security decision.");
    } finally {
      setDecisionLoading("");
    }
  }

  useEffect(() => {
    let active = true;
    async function loadSecurity() {
      try {
        const [securityResponse, findingsResponse, graphResponse, incidentResponse, copilotResponse] = await Promise.all([getSecurityCenter(), getSecurityFindings(), getWorkflowGraph(), getSecurityIncidents(), getSecurityCopilot()]);
        if (!active) return;
        setSummary(securityResponse.summary); setEvents(securityResponse.events); setFindings(findingsResponse.findings); setRiskGraph(graphResponse); setIncidents(incidentResponse.incidents); setCopilot(copilotResponse); setError("");
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load security telemetry.");
      } finally { if (active) setLoading(false); }
    }
    void loadSecurity();
    const refresh = window.setInterval(loadSecurity, 8000);
    return () => { active = false; window.clearInterval(refresh); };
  }, []);

  const criticalFindings = useMemo(() => findings.filter((finding) => ["critical", "high"].includes(finding.severity.toLowerCase())), [findings]);

  return <div className="app-shell"><Sidebar /><div className="main-area"><Topbar /><main className="dashboard security-page">
    <section className="page-heading security-hero-heading"><div><div className="eyebrow">SECURITY OPERATIONS / LIVE</div><h1>Security Center</h1><p>Identity behavior, policy decisions, and adaptive response in one operational view.</p></div><div className="live-status"><span className="status-pulse" /> Live telemetry · refreshes every 8s</div></section>
    {error && <div className="security-load-error" role="alert"><Icon name="shield" /><span>{error}</span></div>}
    {decisionError && <div className="security-load-error" role="alert"><Icon name="shield" /><span>{decisionError}</span></div>}
    <section className="security-posture-grid">
      <article className="posture-score">
        <span className="security-metric-label">SECURITY POSTURE</span>
        <strong>{loading ? "—" : summary?.security_score ?? 0}<small>/100</small></strong>
        <div className="posture-meter"><span style={{ width: `${summary?.security_score ?? 0}%` }} /></div>
        <span>{(summary?.security_score ?? 0) >= 80 ? "Operational confidence" : "Review required"}</span>
      </article>
      <SecurityMetric label="ACTIVE INCIDENTS" value={loading ? "—" : incidents.length} detail="Open response records" tone={incidents.length ? "danger" : "success"} />
      <SecurityMetric label="SUSPENDED IDENTITIES" value={loading ? "—" : incidents.filter((incident) => incident.suspended).length} detail="Adaptive restrictions" tone="warning" />
      <SecurityMetric label="RECENT VIOLATIONS" value={loading ? "—" : summary?.blocked_requests ?? 0} detail="Denied by policy" tone="info" />
      <AttackTimeMetric incident={latestIncident} />
    </section>
    <section className="security-main-grid"><article className="panel security-panel activity-command-panel"><div className="panel-header"><div><div className="panel-kicker">LIVE SECURITY ACTIVITY</div><h2>What is happening now</h2></div><StatusBadge>{`${events.length} events`}</StatusBadge></div>{events.length === 0 ? <div className="resource-empty"><div className="security-state-icon"><Icon name="database" /></div><h3>No active security events</h3><p>Policy and audit telemetry will appear here as it is indexed.</p></div> : <div className="activity-command-list">{events.slice(0, 8).map((event) => <div className="command-event" key={event.event_id}><span className={`command-event-dot ${event.severity.toLowerCase()}`} /><div><strong>{event.event_type}</strong><span>{event.description}</span></div><div className="command-event-meta"><b>{event.decision}</b><small>{event.status}</small></div></div>)}</div>}</article><article className="panel security-panel copilot-panel"><div className="panel-header"><div><div className="panel-kicker">AI SECURITY</div><h2>Threat assessment</h2></div><StatusBadge>{copilot?.provider ?? "Loading"}</StatusBadge></div><div className="copilot-assessment"><span className="copilot-label">CURRENT THREAT</span><strong>{copilot?.what_happened ?? "No current threat assessment"}</strong><span className="copilot-label">WHY IT MATTERS</span><p>{copilot?.why_suspicious ?? "The analyst will explain suspicious behavior when evidence is available."}</p><div className="copilot-risk"><span>RISK ASSESSMENT</span><strong>{copilot?.risk_explanation ?? "No risk evidence"}</strong></div><div className="copilot-recommendation"><span>RECOMMENDED ACTION</span><strong>{copilot?.recommendation ?? "Continue monitoring"}</strong></div></div></article></section>
    <section className="panel security-panel behavioral-panel"><div className="panel-header"><div><div className="panel-kicker">BEHAVIORAL ANALYSIS</div><h2>Identity behavior, not isolated failures</h2><p className="panel-description">Signals are derived from the current workflow incident and indexed security events.</p></div><StatusBadge>{latestIncident ? `${latestIncident.violations} violations` : "Awaiting evidence"}</StatusBadge></div><BehavioralAnalysis incident={latestIncident} /></section>
    <section className="panel security-panel"><div className="panel-header"><div><div className="panel-kicker">RESPONSE PIPELINE</div><h2>Attack to administrative alert</h2></div><StatusBadge>{latestIncident?.suspended ? "Identity suspended" : "Monitoring"}</StatusBadge></div><IncidentPipeline incident={latestIncident} /></section>
    <section className="security-main-grid"><article className="panel security-panel"><div className="panel-header"><div><div className="panel-kicker">TRUST INTELLIGENCE</div><h2>Why this identity is trusted or restricted</h2></div><StatusBadge>{riskGraph ? `${riskGraph.count.nodes} nodes` : "Loading"}</StatusBadge></div><TrustGraph graph={riskGraph} /></article><article className="panel security-panel incident-panel"><div className="panel-header"><div><div className="panel-kicker">INCIDENT QUEUE</div><h2>Human review queue</h2><p className="panel-description">Select one incident to review evidence and choose the response.</p></div><StatusBadge>{`${incidents.length} records`}</StatusBadge></div><IncidentQueue incidents={incidents} selectedId={selectedIncident?.incident_id ?? null} onSelect={setSelectedIncidentId} />{selectedIncident && <div className="incident-card incident-review-card"><div className="incident-card-top"><span className={severityClass(selectedIncident.severity)}>{selectedIncident.severity}</span><code>{selectedIncident.incident_id}</code></div><strong>{selectedIncident.identity}</strong><span>{selectedIncident.attack_type} against {selectedIncident.resource}</span><div className="incident-card-meta"><span>Risk <b>{selectedIncident.risk_score}/100</b></span><span>Decision <b>{selectedIncident.decision}</b></span><span>Identity <b>{selectedIncident.status ?? (selectedIncident.suspended ? "SUSPENDED" : "OPEN")}</b></span></div><div className="incident-evidence-summary"><span>{selectedIncident.evidence.length} evidence record(s)</span><span>{selectedIncident.violations} violation(s)</span><span>{selectedIncident.action} request</span></div><div className="human-response-label">HUMAN RESPONSE</div><div className="incident-decision-actions"><button type="button" onClick={() => void decideIncident("ACCEPT")} disabled={Boolean(decisionLoading)}>Accept · acknowledge</button><button type="button" onClick={() => void decideIncident("SUSPEND")} disabled={Boolean(decisionLoading)}>Suspend identity</button><button type="button" onClick={() => void decideIncident("BLOCK")} disabled={Boolean(decisionLoading)}>Block identity</button></div></div>}</article></section>
    <section className="panel security-panel findings-panel"><div className="panel-header"><div><div className="panel-kicker">ANALYZED EVIDENCE</div><h2>Findings</h2></div><StatusBadge>{`${criticalFindings.length} high priority`}</StatusBadge></div>{findings.length === 0 ? <div className="resource-empty"><div className="security-state-icon"><Icon name="check" /></div><h3>No findings</h3><p>The Security Agent has not detected analyzed threats yet.</p></div> : <div className="finding-strip">{findings.slice(0, 6).map((finding) => <div className="finding-chip" key={finding.event_id}><span className={severityClass(finding.severity)}>{finding.severity}</span><strong>{finding.event_name}</strong><small>Risk {finding.risk_score}/100</small></div>)}</div>}</section>
  </main></div></div>;
}

export default Security;