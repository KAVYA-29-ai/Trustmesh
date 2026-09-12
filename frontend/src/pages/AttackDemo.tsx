import { useState } from "react";
import { Link } from "react-router-dom";

import StatusBadge from "../components/ui/StatusBadge";
import { bankAdmin, simulateAttack, type AttackSimulationResult, type BankActionResult } from "../services/demo";

const targetIdentity = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const targetRequest = { org_id: "acme-organization", did: targetIdentity, role: "Employee", resource_id: "acme-bank-admin", action: "ADMIN" };

type AttackView = {
  allowed: boolean;
  identity: string;
  action: string;
  risk_score?: number;
  severity?: string;
  incident_id?: string;
  event_id?: string;
};

function toAttackView(result: { identity: string; action?: string; risk_score?: number; severity?: string; incident_id?: string; event_id?: string; allowed?: boolean }): AttackView {
  return {
    allowed: Boolean(result.allowed),
    identity: result.identity,
    action: result.action ?? "ADMIN",
    risk_score: result.risk_score,
    severity: result.severity,
    incident_id: result.incident_id,
    event_id: result.event_id,
  };
}

function AttackDemo() {
  const [probe, setProbe] = useState<BankActionResult | null>(null);
  const [simulation, setSimulation] = useState<AttackSimulationResult | null>(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const attempts: AttackView[] = simulation ? simulation.attempts.map(toAttackView) : (probe ? [toAttackView(probe)] : []);
  const final: AttackView | null = simulation ? toAttackView(simulation.final) : (probe ? toAttackView(probe) : null);

  async function probeBank() {
    setLoading("probe"); setError("");
    try { setProbe(await bankAdmin(targetRequest)); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Bank target request failed."); }
    finally { setLoading(""); }
  }

  async function runSequence() {
    setLoading("sequence"); setError("");
    try { setSimulation(await simulateAttack({ ...targetRequest, resource_id: "acme-admin-console" })); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Attack simulation failed."); }
    finally { setLoading(""); }
  }

  return <div className="attack-shell"><header className="attack-header"><div className="attack-brand"><span className="attack-mark">!</span><div><strong>Controlled Attack Demo</strong><span>TrustMesh safe simulation environment</span></div></div><div className="attack-header-links"><Link to="/bank">Bank Target</Link><Link to="/security">TrustMesh Control Plane</Link></div></header><main className="attack-content">
    <section className="attack-hero"><div><span className="side-eyebrow attack-eyebrow">ATTACK DEMO / CONTROLLED CLIENT</span><h1>Probe the bank. Watch TrustMesh respond.</h1><p>This console represents an unauthorized client attempting a privileged bank operation. It never targets a real system and cannot bypass the TrustMesh backend checkpoint.</p></div><StatusBadge variant="warning">Synthetic and controlled</StatusBadge></section>
    <div className="attack-layout"><section className="attack-console"><div className="console-heading"><div><span className="panel-kicker">ATTACKER CONSOLE</span><h2>Privilege probe</h2></div><span className="console-dot">SIMULATION ONLY</span></div><div className="target-grid"><div><span>TARGET APPLICATION</span><strong>Acme Bank</strong></div><div><span>TARGET IDENTITY</span><strong>Jordan Lee · Employee</strong></div><div><span>TARGET ACTION</span><strong>Open bank admin console</strong></div><div><span>REQUIRED PERMISSION</span><strong>ADMIN</strong></div></div><div className="attack-request"><span>POST /demo/bank/admin</span><code>{JSON.stringify(targetRequest, null, 2)}</code></div><div className="attack-actions"><button className="attack-primary" type="button" onClick={() => void probeBank()} disabled={Boolean(loading)}>{loading === "probe" ? "Requesting bank target..." : "Probe bank target"}</button><button className="attack-secondary" type="button" onClick={() => void runSequence()} disabled={Boolean(loading)}>{loading === "sequence" ? "Running sequence..." : "Run 7-request sequence"}</button></div><p className="attack-note">The probe uses the real protected Bank API. The sequence uses the existing safe synthetic attack workflow to produce repeatable evidence.</p>{error && <div className="attack-error" role="alert">{error}</div>}</section>
      <aside className="attack-result"><div className="console-heading"><div><span className="panel-kicker">REQUEST RESULT</span><h2>{final ? "Target response" : "Awaiting attempt"}</h2></div><span className={final?.allowed ? "result-dot allowed" : "result-dot"} /></div>{final ? <><div className={`attack-verdict ${final.allowed ? "allowed" : "denied"}`}><strong>{final.allowed ? "ALLOW" : "DENY"}</strong><span>{final.allowed ? "Unexpected access granted" : "Bank target rejected the request"}</span></div><div className="result-facts"><span>Identity <b>{final.identity}</b></span><span>Action <b>{final.action}</b></span><span>Risk <b>{final.risk_score ?? "—"}/100</b></span><span>Incident <b>{final.incident_id ?? "Pending"}</b></span></div></> : <div className="attack-empty">No request has crossed the target boundary yet.</div>}</aside></div>
    <section className="attack-evidence panel"><div className="console-heading"><div><span className="panel-kicker">OBSERVED EVIDENCE</span><h2>Attack request feed</h2></div><StatusBadge>{attempts.length ? `${attempts.length} requests` : "Standby"}</StatusBadge></div>{attempts.length ? <div className="attack-feed">{attempts.map((attempt, index) => <div className="attack-feed-row" key={`${attempt.event_id ?? index}-${index}`}><span>#{String(index + 1).padStart(2, "0")}</span><strong>Employee → Bank Admin</strong><b>DENIED</b><small>{attempt.severity} · risk {attempt.risk_score ?? 0}/100 · {attempt.event_id ?? "checkpoint response"}</small></div>)}</div> : <div className="attack-empty">Evidence appears here after the first controlled request.</div>}</section>
    <section className="attack-next"><div><span className="side-eyebrow">NEXT CONTROL-PLANE STEP</span><h2>Review the incident in Security Center</h2><p>The attacker cannot suspend or block an identity. A human defender must make that decision in TrustMesh.</p></div><Link className="attack-control-link" to="/security">Open Security Center →</Link></section>
  </main></div>;
}

export default AttackDemo;
