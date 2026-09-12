import { useMemo, useState } from "react";

import ProtectedResource from "../components/security/ProtectedResource";
import StatusBadge from "../components/ui/StatusBadge";
import Icon from "../components/ui/Icon";
import {
  authorizeResource,
  simulateAttack,
  simulatePolicyImpact,
  simulateUnauthorizedAccess,
} from "../services/demo";
import type {
  AttackSimulationResult,
  DemoAccessResult,
  DemoAttackResult,
  PolicySimulationResult,
} from "../services/demo";

type IdentityRole = "Employee" | "Admin";
type Modal = "resource" | "identity" | null;

const employeeIdentity = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const adminIdentity = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

function requestFor(role: IdentityRole, resourceId: string, action: string) {
  return { org_id: "acme-organization", did: role === "Employee" ? employeeIdentity : adminIdentity, role, resource_id: resourceId, action };
}

function decisionReason(result: DemoAccessResult | null): string {
  if (!result) return "Awaiting policy decision";
  return result.allowed ? "Permission granted by policy" : "Required ADMIN permission missing";
}

function RiskMeter({ attempts }: { attempts: DemoAttackResult[] }) {
  const last = attempts[attempts.length - 1];
  const risk = last?.risk_score ?? 0;
  return <div className="demo-risk-visual"><div className="demo-risk-heading"><span>LIVE RISK SCORE</span><strong>{risk}<small>/100</small></strong></div><div className="demo-risk-chart" aria-label={`Risk score ${risk} out of 100`}>{attempts.length === 0 ? <div className="demo-risk-empty">Risk telemetry appears after the first denial.</div> : attempts.map((attempt, index) => <span key={`${attempt.event_id}-${index}`} style={{ height: `${Math.max(10, attempt.risk_score ?? 0)}%` }} title={`Request ${index + 1}: risk ${attempt.risk_score ?? 0}`} />)}</div><div className="demo-risk-axis"><span>baseline</span><span>critical</span></div></div>;
}

function AttackStepper({ attempts }: { attempts: DemoAttackResult[] }) {
  const current = attempts[attempts.length - 1];
  const active = current ? (current.suspended ? 9 : current.risk_score && current.risk_score >= 85 ? 7 : attempts.length >= 2 ? 5 : 4) : 1;
  const steps = [["IDENTITY", "Employee"], ["REQUEST", "Admin Console"], ["POLICY CHECK", "ADMIN permission"], ["DECISION", current ? "DENY" : "Idle"], ["BEHAVIOR", attempts.length > 1 ? "Repeated probing" : "Monitoring"], ["RISK", current?.severity?.toUpperCase() ?? "Idle"], ["RESTRICTION", current?.adaptive_state ?? "Idle"], ["SUSPENSION", current?.suspended ? "Automatic response" : "Not reached"], ["INCIDENT", current?.incident_id ? "Created" : "Not created"]];
  return <div className="demo-stepper">{steps.map(([label, detail], index) => <div className={`demo-step ${index + 1 <= active ? "active" : ""} ${index + 1 === active ? "current" : ""}`} key={label}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{label}</strong><small>{detail}</small></div>{index < steps.length - 1 && <b aria-hidden="true">→</b>}</div>)}</div>;
}

function ResponseChecklist({ attack }: { attack: AttackSimulationResult | null }) {
  const final = attack?.final;
  const checks: Array<[string, boolean]> = [["Access denied", Boolean(final)], ["Suspicious behavior detected", Boolean(final && attack.attempts.length >= 2)], ["Risk escalated", Boolean(final && (final.risk_score ?? 0) >= 85)], ["Adaptive restriction applied", Boolean(final && final.adaptive_state !== "ALLOW")], ["Identity suspended", Boolean(final?.suspended)], ["Audit event recorded", Boolean(final?.event_id)], ["Security incident created", Boolean(final?.incident_id)], ["AI analysis available", Boolean(final?.incident_id)]];
  return <div className="response-checklist">{checks.map(([label, done]) => <div className={done ? "done" : ""} key={label}><span>{done ? "✓" : "○"}</span>{label}</div>)}</div>;
}

function UniversityPortal() {
  const [identity, setIdentity] = useState<IdentityRole>("Employee");
  const [resourceAccess, setResourceAccess] = useState<DemoAccessResult | null>(null);
  const [adminAccess, setAdminAccess] = useState<DemoAccessResult | null>(null);
  const [singleDenial, setSingleDenial] = useState<DemoAttackResult | null>(null);
  const [simulation, setSimulation] = useState<AttackSimulationResult | null>(null);
  const [policySimulation, setPolicySimulation] = useState<PolicySimulationResult | null>(null);
  const [intensity, setIntensity] = useState("High");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const attempts = simulation?.attempts ?? (singleDenial ? [singleDenial] : []);
  const lastAttempt = attempts[attempts.length - 1];
  const risk = lastAttempt?.risk_score ?? 0;
  const did = identity === "Employee" ? employeeIdentity : adminIdentity;
  const displayIdentity = identity === "Employee" ? "Jordan Lee" : "Alex Morgan";
  const resourceStatus = useMemo(() => resourceAccess ? (resourceAccess.allowed ? "ALLOWED" : "DENIED") : "READY", [resourceAccess]);

  function clearDecisions() { setResourceAccess(null); setAdminAccess(null); setSingleDenial(null); setSimulation(null); setPolicySimulation(null); setError(""); }
  async function openResource() { setError(""); try { setResourceAccess(await authorizeResource(requestFor(identity, "acme-employee-records", "READ"))); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to check resource access."); } }
  async function openAdmin() { setError(""); try { setAdminAccess(await authorizeResource(requestFor(identity, "acme-admin-console", "ADMIN"))); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to check admin access."); } }
  async function denyOnce() { setLoading(true); setError(""); try { setSingleDenial(await simulateUnauthorizedAccess(requestFor("Employee", "acme-admin-console", "ADMIN"))); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to record denial."); } finally { setLoading(false); } }
  async function runSimulation() { setLoading(true); setError(""); try { setSimulation(await simulateAttack(requestFor("Employee", "acme-admin-console", "ADMIN"))); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to run attack simulation."); } finally { setLoading(false); } }
  async function runPolicySimulation() { try { setPolicySimulation(await simulatePolicyImpact({ ...requestFor("Employee", "acme-employee-records", "READ"), simulated_decision: "DENY" })); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to simulate policy impact."); } }

  return <div className="external-app-shell"><header className="external-app-header"><div className="external-app-brand"><span className="external-app-mark">A</span><div><strong>Acme Organization</strong><span>External application · Operations workspace</span></div></div><span className="external-protection-mark"><Icon name="shield" /> Protected by TrustMesh</span></header><main className="external-app-content demo-lab-page">
    <section className="demo-lab-heading"><div><div className="eyebrow">CONTROLLED SECURITY DEMONSTRATION</div><h1>Acme access laboratory</h1><p>Watch an external organization move through identity verification, policy enforcement, behavior monitoring, and risk response.</p></div><StatusBadge>{simulation?.final.suspended ? "Incident active" : "Demo ready"}</StatusBadge></section>
    <div className="demo-architecture-strip"><span>EXTERNAL ORGANIZATION</span><b>→</b><strong>TRUSTMESH</strong><b>→</b><span>ACCESS DECISION</span><b>→</b><span>BEHAVIOR MONITORING</span><b>→</b><span>RISK RESPONSE</span></div>
    <section className="demo-split-layout"><div className="demo-application-side"><div className="demo-side-heading"><div><span className="demo-side-label">APPLICATION SIDE</span><h2>Acme Organization</h2></div><span className="demo-side-status"><i /> Protected application</span></div>
      <section className={`demo-identity-card ${identity === "Admin" ? "admin" : ""}`}><div className="demo-identity-main"><span className="demo-avatar">{displayIdentity[0]}</span><div><span className="panel-kicker">CURRENT IDENTITY</span><strong>{displayIdentity}</strong><span>{identity} · {simulation?.final.suspended ? "Suspended" : "Active"}</span></div></div><div className="identity-selector" role="group" aria-label="Select current identity"><button type="button" className={identity === "Employee" ? "active" : ""} onClick={() => { setIdentity("Employee"); clearDecisions(); }}>Employee</button><button type="button" className={identity === "Admin" ? "active" : ""} onClick={() => { setIdentity("Admin"); clearDecisions(); }}>Admin</button></div><code>{did}</code></section>
      <div className="demo-section-heading"><div><span className="demo-side-label">PROTECTED RESOURCES</span><h3>Application access</h3></div><button type="button" className="demo-quiet-action" onClick={() => setModal("resource")}>+ Register Resource</button></div>
      <div className="demo-resource-stack"><article className="demo-resource-card demo-resource-safe"><div className="demo-resource-top"><span className="demo-resource-icon"><Icon name="resource" /></span><StatusBadge variant={resourceAccess?.allowed ? "success" : "neutral"}>{resourceStatus}</StatusBadge></div><span className="panel-kicker">STANDARD RESOURCE</span><h3>Employee Records</h3><p>Profile, team assignments, and organization records.</p><div className="demo-resource-meta"><span>TYPE <b>Organization data</b></span><span>ACCESS <b>READ</b></span><span>POLICY <b>Employee / Admin</b></span></div><button type="button" className="primary-action" onClick={openResource}>Open Employee Records</button>{resourceAccess && <div className={`portal-decision ${resourceAccess.allowed ? "allowed" : "denied"}`}><strong>{resourceAccess.decision}</strong><span>{decisionReason(resourceAccess)}</span></div>}
      
      <ProtectedResource
        orgId="acme-organization"
        did={did}
        resourceId="acme-employee-records"
        action="READ">
        <div className="portal-protected-content">
          <strong>Records available</strong>
          <span>
            Protected content rendered after the TrustMesh SDK
            authorization decision.
          </span>
        </div>
      </ProtectedResource>

      </article>
        <article className="demo-resource-card demo-resource-privileged"><div className="demo-resource-top"><span className="demo-resource-icon"><Icon name="shield" /></span><StatusBadge variant={adminAccess?.allowed ? "success" : "warning"}>{adminAccess ? adminAccess.decision : "PRIVILEGED"}</StatusBadge></div><span className="panel-kicker">ELEVATED RESOURCE</span><h3>Admin Console</h3><p>Identity, policy, and security administration for Acme.</p><div className="demo-resource-meta"><span>TYPE <b>Control plane</b></span><span>REQUIRED <b>ADMIN</b></span><span>GUARD <b>PolicyEngine</b></span></div><button type="button" className="primary-action" onClick={openAdmin}>Open Admin Console</button>{adminAccess && <div className={`portal-decision ${adminAccess.allowed ? "allowed" : "denied"}`}><strong>{adminAccess.decision}</strong><span>{decisionReason(adminAccess)}</span></div>}

      <ProtectedResource
        orgId="acme-organization"
        did={did}
        resourceId="acme-admin-console"
        action="ADMIN">
        <div className="portal-protected-content">
          <strong>Admin console available</strong>
          <span>
            Elevated access granted by the active TrustMesh
            policy.
          </span>
        </div>
      </ProtectedResource>

      </article></div><div className="demo-application-footer"><span>External application boundary</span><span>Decisions are enforced outside this UI</span></div>
    </div><aside className="demo-attack-side"><div className="demo-side-heading"><div><span className="demo-side-label">DEFENDER / ATTACK SIDE</span><h2>TrustMesh Attack Simulator</h2></div><span className="demo-danger-status"><i /> Controlled</span></div><p className="demo-attack-subtitle">Controlled security demonstration · target identity is always Employee.</p><div className="demo-attack-target"><div><span>TARGET IDENTITY</span><strong>Employee</strong></div><div><span>TARGET RESOURCE</span><strong>Admin Console</strong></div><div><span>ATTACK TYPE</span><strong>Privilege probing</strong></div></div><label className="demo-intensity-label">ATTACK INTENSITY<select value={intensity} onChange={(event) => setIntensity(event.target.value)}><option>Low</option><option>Medium</option><option>High</option></select></label><button type="button" className="attack-action demo-primary-attack" onClick={runSimulation} disabled={loading}><Icon name="shield" />{loading ? "Running live sequence..." : "Start Attack Simulation"}</button><div className="demo-secondary-actions"><button type="button" className="attack-action" onClick={denyOnce} disabled={loading}>Simulate Single Denial</button><button type="button" className="demo-reset-action" onClick={clearDecisions}>Reset View</button></div>
      <div className="demo-feed"><div className="demo-feed-heading"><span>LIVE ATTACK FEED</span><b>{attempts.length ? `${attempts.length} requests` : "Standby"}</b></div>{attempts.length === 0 ? <div className="demo-feed-empty">No attack evidence yet. Start the controlled sequence to stream real denial events.</div> : attempts.map((attempt, index) => <div className="demo-feed-event" key={attempt.event_id}><span className="demo-feed-index">REQUEST #{String(index + 1).padStart(2, "0")}</span><strong>Employee → Admin Console</strong><b>DENIED</b><small>{index > 0 ? "Repeated violation" : "Policy violation"} · {attempt.severity} · risk {attempt.risk_score ?? 0}/100</small></div>)}</div></aside></section>
    <section className="demo-lab-panel"><div className="demo-panel-heading"><div><span className="demo-side-label">SECURITY PIPELINE</span><h2>Attack progression</h2></div><span>Real workflow state</span></div><AttackStepper attempts={attempts} /></section>
    <section className="demo-analysis-grid"><article className="demo-lab-panel"><div className="demo-panel-heading"><div><span className="demo-side-label">IDENTITY BEHAVIOR</span><h2>Normal → anomalous → threat pattern</h2></div><span>Derived from indexed events</span></div><div className="demo-behavior-track"><div><strong>NORMAL</strong><span>Expected role activity</span></div><b>→</b><div className={attempts.length > 1 ? "active" : ""}><strong>ANOMALOUS</strong><span>{attempts.length ? `${attempts.length} denied requests` : "Awaiting deviation"}</span></div><b>→</b><div className={risk >= 85 ? "critical" : ""}><strong>THREAT PATTERN</strong><span>{risk >= 85 ? "Risk escalation" : "Not reached"}</span></div></div><div className="demo-behavior-metrics"><span>Denied requests <b>{attempts.length}</b></span><span>Request sequence <b>{attempts.length ? `1–${attempts.length}` : "—"}</b></span><span>Risk score <b>{risk}/100</b></span></div></article><article className="demo-lab-panel"><div className="demo-panel-heading"><div><span className="demo-side-label">RISK TELEMETRY</span><h2>Risk escalation</h2></div><span>Actual attack results</span></div><RiskMeter attempts={attempts} /></article></section>
    <section className="demo-analysis-grid"><article className="demo-lab-panel"><div className="demo-panel-heading"><div><span className="demo-side-label">TRUST / RISK RELATIONSHIP</span><h2>Why access changed</h2></div></div><div className="demo-relationship"><span>Employee</span><b>↓</b><span>Employee role</span><b>↓</b><span>ADMIN request</span><b>↓</b><span className="danger">Denied requests</span><b>↓</b><span className="danger">Risk {risk}/100</span><b>↓</b><span className={simulation?.final.suspended ? "danger" : ""}>{simulation?.final.suspended ? "Suspended" : "Restriction pending"}</span></div></article><article className="demo-lab-panel"><div className="demo-panel-heading"><div><span className="demo-side-label">AUTOMATIC SECURITY RESPONSE</span><h2>Defender actions</h2></div></div><ResponseChecklist attack={simulation} /></article></section>
    {error && <div className="security-load-error" role="alert"><Icon name="shield" /><span>{error}</span></div>}<section className="demo-lab-panel demo-policy-tool"><div><span className="demo-side-label">POLICY IMPACT</span><h2>Preview a policy change</h2><p>Simulation only. The active PolicyEngine policy is not mutated.</p></div><button type="button" className="primary-action" onClick={runPolicySimulation}>Simulate Employee Records denial</button>{policySimulation && <div className="portal-decision denied"><strong>{policySimulation.current_decision} → {policySimulation.simulated_decision}</strong><span>Policy unchanged</span></div>}</section>
    {modal && <div className="demo-modal-backdrop" role="presentation" onClick={() => setModal(null)}><section className="demo-modal" role="dialog" aria-modal="true" aria-labelledby="demo-modal-title" onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setModal(null)} aria-label="Close">×</button><span className="demo-side-label">{modal === "resource" ? "RESOURCE REGISTRATION" : "IDENTITY MANAGEMENT"}</span><h2 id="demo-modal-title">{modal === "resource" ? "Register a resource" : "Add an identity"}</h2><p>{modal === "resource" ? "Resource creation is not exposed by the current backend API. Existing protected resources are listed and can be tested here." : "Identity creation is not exposed by the current backend API. Use the supported Employee/Admin demo identity selector instead."}</p><div className="demo-modal-note"><Icon name="shield" /><span>No record was created. This preserves the existing API boundary and security authority.</span></div><button type="button" className="primary-action" onClick={() => setModal(null)}>Close</button></section></div>}
  </main></div>;
}

export default UniversityPortal;