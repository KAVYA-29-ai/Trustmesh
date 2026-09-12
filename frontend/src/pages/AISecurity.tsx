import { useEffect, useMemo, useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import Icon from "../components/ui/Icon";
import StatusBadge from "../components/ui/StatusBadge";
import {
  getSecurityCopilot,
  getSecurityFindings,
  getSecurityIncidents,
  getWorkflowGraph,
} from "../services/security";
import type {
  RiskGraphResponse,
  SecurityCopilotResponse,
  SecurityFinding,
  SecurityIncident,
} from "../types/api";

function severityClass(value?: string) {
  return `ai-severity ai-severity-${(value ?? "unknown").toLowerCase()}`;
}

function shortValue(value?: string | null, length = 28) {
  if (!value) return "Unknown";
  return value.length > length
    ? `${value.slice(0, Math.floor(length * 0.55))}...${value.slice(-7)}`
    : value;
}

function EmptyState({
  title = "No analysis available",
  message = "Run a controlled attack scenario to generate evidence for analysis.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="ai-empty-state">
      <div className="ai-empty-icon">
        <Icon name="database" />
      </div>
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="ai-section-header">
      <div>
        <div className="ai-eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {right}
    </div>
  );
}

function ThreatBrief({
  incident,
  copilot,
}: {
  incident: SecurityIncident | null;
  copilot: SecurityCopilotResponse | null;
}) {
  if (!incident) {
    return (
      <section className="ai-panel ai-threat-panel">
        <EmptyState />
      </section>
    );
  }

  const state =
    incident.status ??
    (incident.suspended ? "SUSPENDED" : "ACTIVE");

  return (
    <section className="ai-panel ai-threat-panel">
      <div className="ai-threat-topline">
        <div>
          <div className="ai-eyebrow">CURRENT THREAT BRIEF</div>
          <div className="ai-threat-heading">
            <h2>{copilot?.what_happened ?? incident.attack_type}</h2>
            <span className={severityClass(incident.severity)}>
              {incident.severity}
            </span>
          </div>
        </div>

        <div className="ai-threat-risk">
          <span>RISK</span>
          <strong>{incident.risk_score}</strong>
          <small>/100</small>
        </div>
      </div>

      <div className="ai-threat-divider" />

      <div className="ai-threat-facts">
        <div>
          <span>IDENTITY</span>
          <strong>{shortValue(incident.identity)}</strong>
        </div>

        <div>
          <span>ROLE</span>
          <strong>{incident.role}</strong>
        </div>

        <div>
          <span>RESOURCE</span>
          <strong>{incident.resource}</strong>
        </div>

        <div>
          <span>ACTION</span>
          <strong>{incident.action}</strong>
        </div>

        <div>
          <span>DECISION</span>
          <strong
            className={
              incident.decision === "DENY"
                ? "ai-danger-text"
                : "ai-success-text"
            }
          >
            {incident.decision}
          </strong>
        </div>

        <div>
          <span>ENFORCEMENT</span>
          <strong className={state !== "ACTIVE" ? "ai-danger-text" : ""}>
            {state}
          </strong>
        </div>
      </div>
    </section>
  );
}

function ReasoningChain({
  incident,
  copilot,
}: {
  incident: SecurityIncident | null;
  copilot: SecurityCopilotResponse | null;
}) {
  if (!incident) return <EmptyState />;

  const stages = incident.timeline
    .map((stage) => stage.stage.replaceAll("_", " "))
    .filter(Boolean);

  const steps = [
    {
      number: "01",
      title: "Request context",
      text: `${incident.identity} using the ${incident.role} role requested ${incident.action} on ${incident.resource}.`,
    },
    {
      number: "02",
      title: "Behavioral signal",
      text: `${incident.violations} denied request${
        incident.violations === 1 ? "" : "s"
      } formed the observed ${incident.threat_type.toLowerCase()} pattern.`,
    },
    {
      number: "03",
      title: "Risk interpretation",
      text:
        copilot?.risk_explanation ??
        `TrustMesh assigned ${incident.risk_score}/100 risk at ${incident.severity} severity.`,
    },
    {
      number: "04",
      title: "Decision explanation",
      text: `The request was ${incident.decision.toLowerCase()} because the protected resource policy and recorded security context were not satisfied.`,
    },
  ];

  return (
    <div className="ai-reasoning-chain">
      {steps.map((step, index) => (
        <div className="ai-reasoning-step" key={step.number}>
          <div className="ai-step-number">{step.number}</div>

          <div className="ai-step-content">
            <div className="ai-step-title">{step.title}</div>
            <p>{step.text}</p>

            {index === steps.length - 1 && stages.length > 0 && (
              <div className="ai-stage-path">
                {stages.map((stage, stageIndex) => (
                  <span key={`${stage}-${stageIndex}`}>
                    {stage}
                    {stageIndex < stages.length - 1 && (
                      <b>→</b>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function BehavioralAnalysis({
  incident,
}: {
  incident: SecurityIncident | null;
}) {
  if (!incident) return <EmptyState />;

  return (
    <div className="ai-behavior">
      <div className="ai-behavior-track">
        <div className="ai-behavior-node ai-behavior-normal">
          <span>01</span>
          <strong>Normal baseline</strong>
          <small>Expected role and resource usage</small>
        </div>

        <div className="ai-behavior-line" />

        <div className="ai-behavior-node ai-behavior-anomaly">
          <span>02</span>
          <strong>Anomalous behavior</strong>
          <small>
            {incident.violations} correlated denied request
            {incident.violations === 1 ? "" : "s"}
          </small>
        </div>

        <div className="ai-behavior-line" />

        <div className="ai-behavior-node ai-behavior-threat">
          <span>03</span>
          <strong>Threat pattern</strong>
          <small>{incident.threat_type}</small>
        </div>
      </div>

      <div className="ai-behavior-facts">
        <div>
          <span>REQUEST PATTERN</span>
          <strong>
            {incident.violations} denied request
            {incident.violations === 1 ? "" : "s"}
          </strong>
          <small>Correlated policy failures</small>
        </div>

        <div>
          <span>RESOURCE TARGET</span>
          <strong>{shortValue(incident.resource, 24)}</strong>
          <small>Protected resource</small>
        </div>

        <div>
          <span>ACCESS SEQUENCE</span>
          <strong>{shortValue(incident.threat_type, 24)}</strong>
          <small>Observed threat pattern</small>
        </div>

        <div>
          <span>RISK RESPONSE</span>
          <strong>{incident.risk_score}/100</strong>
          <small>{incident.suspended ? "Identity suspended" : "Under review"}</small>
        </div>
      </div>
    </div>
  );
}

function TrustContext({
  graph,
  incident,
}: {
  graph: RiskGraphResponse | null;
  incident: SecurityIncident | null;
}) {
  if (!graph || !incident) return <EmptyState />;

  const identity = graph.nodes.find((node) => node.type === "identity");
  const role = graph.nodes.find((node) => node.type === "role");
  const resource = graph.nodes.find((node) => node.type === "resource");
  const threat = graph.nodes.find((node) => node.type === "threat");

  const nodes = [
    {
      label: "IDENTITY",
      value: identity?.label ?? incident.identity,
    },
    {
      label: "ROLE",
      value: role?.label ?? incident.role,
    },
    {
      label: "RESOURCE",
      value: resource?.label ?? incident.resource,
    },
    {
      label: "ACTION",
      value: incident.action,
    },
    {
      label: "THREAT",
      value: threat?.label ?? incident.threat_type,
    },
    {
      label: "DECISION",
      value: incident.decision,
    },
  ];

  return (
    <div className="ai-trust-chain">
      {nodes.map((node, index) => (
        <div className="ai-trust-node-wrap" key={node.label}>
          <div
            className={`ai-trust-node ${
              node.label === "DECISION" && incident.decision === "DENY"
                ? "ai-trust-node-danger"
                : ""
            }`}
          >
            <span>{node.label}</span>
            <strong>{shortValue(node.value, 25)}</strong>
          </div>

          {index < nodes.length - 1 && (
            <div className="ai-trust-arrow">→</div>
          )}
        </div>
      ))}
    </div>
  );
}

function DecisionExplanation({
  incident,
}: {
  incident: SecurityIncident | null;
}) {
  const decision = incident?.decision ?? "";

  return (
    <div className="ai-decision-list">
      <div className={decision === "ALLOW" ? "active" : ""}>
        <span className="ai-decision-symbol">A</span>
        <div>
          <strong>ALLOW</strong>
          <p>Identity and policy context satisfy the protected request.</p>
        </div>
      </div>

      <div
        className={
          decision === "DENY"
            ? "active ai-decision-deny"
            : ""
        }
      >
        <span className="ai-decision-symbol">D</span>
        <div>
          <strong>DENY</strong>
          <p>
            {incident
              ? `${incident.action} on ${incident.resource} was denied by the security workflow.`
              : "No denied request is currently selected."}
          </p>
        </div>
      </div>

      <div className={decision === "ADAPT" ? "active" : ""}>
        <span className="ai-decision-symbol">A</span>
        <div>
          <strong>ADAPT</strong>
          <p>
            Additional controls can be required when behavioral risk changes.
          </p>
        </div>
      </div>
    </div>
  );
}

function Findings({
  findings,
  incidents,
  selectedIncident,
  onSelect,
}: {
  findings: SecurityFinding[];
  incidents: SecurityIncident[];
  selectedIncident: SecurityIncident | null;
  onSelect: (incidentId: string) => void;
}) {
  if (!findings.length) return <EmptyState />;

  return (
    <div className="ai-findings">
      {findings.slice(0, 10).map((finding) => {
        const match = incidents.find((incident) =>
          incident.evidence.some(
            (evidence) => evidence.event_id === finding.event_id,
          ),
        );

        return (
          <button
            type="button"
            className={`ai-finding ${
              match?.incident_id === selectedIncident?.incident_id
                ? "selected"
                : ""
            }`}
            key={finding.event_id}
            onClick={() => {
              if (match) onSelect(match.incident_id);
            }}
            disabled={!match}
          >
            <span className={severityClass(finding.severity)}>
              {finding.severity}
            </span>

            <div className="ai-finding-main">
              <strong>{finding.event_name}</strong>
              <small>{finding.reason}</small>
            </div>

            <b>{finding.risk_score}/100</b>
          </button>
        );
      })}
    </div>
  );
}

function AISecurity() {
  const [copilot, setCopilot] =
    useState<SecurityCopilotResponse | null>(null);
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [graph, setGraph] =
    useState<RiskGraphResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAnalysis() {
      try {
        const [
          copilotResponse,
          findingsResponse,
          incidentResponse,
          graphResponse,
        ] = await Promise.all([
          getSecurityCopilot(),
          getSecurityFindings(),
          getSecurityIncidents(),
          getWorkflowGraph(),
        ]);

        if (!active) return;

        setCopilot(copilotResponse);
        setFindings(findingsResponse.findings);
        setIncidents(incidentResponse.incidents);
        setGraph(graphResponse);
        setError("");
      } catch (requestError) {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load security intelligence.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAnalysis();

    const refresh = window.setInterval(loadAnalysis, 8000);

    return () => {
      active = false;
      window.clearInterval(refresh);
    };
  }, []);

  const selectedIncident =
    incidents.find(
      (incident) => incident.incident_id === selectedId,
    ) ??
    incidents[0] ??
    null;

  const latestFinding = useMemo(
    () =>
      findings.find((finding) =>
        selectedIncident?.evidence.some(
          (evidence) => evidence.event_id === finding.event_id,
        ),
      ) ??
      findings[0] ??
      null,
    [findings, selectedIncident],
  );

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-area">
        <Topbar />

        <main className="dashboard ai-security-page">
          <section className="ai-page-header">
            <div>
              <div className="ai-eyebrow">
                TRUSTMESH INTELLIGENCE / ANALYSIS
              </div>

              <h1>AI Security</h1>

              <p>
                Evidence-backed security intelligence explaining why
                TrustMesh detected, scored, and responded to a threat.
              </p>
            </div>

            <div className="ai-analysis-status">
              <span className={loading ? "loading" : ""} />
              {loading
                ? "Analyzing evidence"
                : copilot?.provider ?? "Security analysis active"}
            </div>
          </section>

          {error && (
            <div className="ai-error" role="alert">
              <Icon name="shield" />
              <span>{error}</span>
            </div>
          )}

          <ThreatBrief
            incident={selectedIncident}
            copilot={copilot}
          />

          <section className="ai-panel">
            <SectionHeader
              eyebrow="01 / EVIDENCE REASONING"
              title="Why TrustMesh flagged this"
              description="The security agent correlates request context, behavior, risk, and policy evidence."
            />

            <ReasoningChain
              incident={selectedIncident}
              copilot={copilot}
            />
          </section>

          <section className="ai-panel">
            <SectionHeader
              eyebrow="02 / BEHAVIORAL INTELLIGENCE"
              title="Behavioral analysis"
              description="Patterns are evaluated across correlated requests rather than isolated failures."
              right={
                selectedIncident ? (
                  <div className="ai-count">
                    {selectedIncident.violations} correlated signals
                  </div>
                ) : undefined
              }
            />

            <BehavioralAnalysis incident={selectedIncident} />
          </section>

          <section className="ai-two-column">
            <section className="ai-panel">
              <SectionHeader
                eyebrow="03 / RISK REASONING"
                title="Why the risk increased"
              />

              {selectedIncident ? (
                <div className="ai-risk-analysis">
                  <div className="ai-risk-number">
                    <strong>{selectedIncident.risk_score}</strong>
                    <span>/100</span>
                  </div>

                  <div className="ai-risk-bar">
                    <span
                      style={{
                        width: `${Math.min(
                          selectedIncident.risk_score,
                          100,
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="ai-risk-meta">
                    <span>
                      Severity
                      <b>{selectedIncident.severity}</b>
                    </span>

                    <span>
                      Evidence
                      <b>{selectedIncident.violations}</b>
                    </span>

                    <span>
                      Decision
                      <b>{selectedIncident.decision}</b>
                    </span>
                  </div>

                  <p>
                    {copilot?.risk_explanation ??
                      `TrustMesh classified this activity at ${selectedIncident.risk_score}/100 based on ${selectedIncident.violations} correlated violation(s).`}
                  </p>
                </div>
              ) : (
                <EmptyState />
              )}
            </section>

            <section className="ai-panel">
              <SectionHeader
                eyebrow="04 / TRUST CONTEXT"
                title="Identity → resource relationship"
              />

              <TrustContext
                graph={graph}
                incident={selectedIncident}
              />
            </section>
          </section>

          <section className="ai-two-column">
            <section className="ai-panel">
              <SectionHeader
                eyebrow="05 / DECISION INTELLIGENCE"
                title="Why ALLOW / DENY / ADAPT?"
              />

              <DecisionExplanation
                incident={selectedIncident}
              />
            </section>

            <section className="ai-panel ai-recommendation-panel">
              <SectionHeader
                eyebrow="06 / SECURITY AGENT"
                title="Recommended response"
              />

              <div className="ai-recommendation">
                <div className="ai-recommendation-mark">
                  <Icon name="shield" />
                </div>

                <div>
                  <strong>
                    {copilot?.recommendation ??
                      "No recommendation available."}
                  </strong>

                  <p>
                    {selectedIncident
                      ? "Recommendation is derived from the selected incident evidence. Final enforcement remains a human administrator decision in Security Center."
                      : "Generate a controlled security event to receive an evidence-backed recommendation."}
                  </p>
                </div>
              </div>
            </section>
          </section>

          <section className="ai-panel">
            <SectionHeader
              eyebrow="07 / ANALYZED EVIDENCE"
              title="Evidence summary"
              description="Select evidence to change the analysis subject."
              right={
                <div className="ai-count">
                  {findings.length} findings
                </div>
              }
            />

            <Findings
              findings={findings}
              incidents={incidents}
              selectedIncident={selectedIncident}
              onSelect={setSelectedId}
            />
          </section>

          <section className="ai-analysis-subject">
            <div>
              <span>ANALYSIS SUBJECT</span>
              <strong>
                {selectedIncident
                  ? selectedIncident.attack_type
                  : "No incident selected"}
              </strong>
            </div>

            <select
              value={selectedIncident?.incident_id ?? ""}
              onChange={(event) =>
                setSelectedId(event.target.value || null)
              }
            >
              <option value="">Select incident</option>

              {incidents.map((incident) => (
                <option
                  value={incident.incident_id}
                  key={incident.incident_id}
                >
                  {incident.attack_type} · {incident.incident_id}
                </option>
              ))}
            </select>

            {latestFinding && (
              <div className="ai-subject-evidence">
                Latest evidence:{" "}
                <strong>{latestFinding.event_name}</strong>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default AISecurity;