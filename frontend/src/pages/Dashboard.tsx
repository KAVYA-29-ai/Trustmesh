import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import { getAuditEvents } from "../services/audit";
import { getResources } from "../services/resources";
import {
  getSecurityCenter,
  getSecurityIncidents,
} from "../services/security";
import type {
  AuditEvent,
  SecurityIncident,
  SecuritySummary,
} from "../types/api";

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3 20 6v5c0 5-3.2 8-8 10-4.8-2-8-5-8-10V6l8-3Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 12h4l2-6 4 12 2-6h6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IdentityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle
        cx="12"
        cy="8"
        r="3"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M5 20a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PolicyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m12 3 7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8.5 12h7M12 8.5v7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ResourceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="m4.5 7.5 7.5 4 7.5-4M12 12v9"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8h9M8 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4 21 20H3L12 4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 9v5M12 17.5v.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m5 12 4 4L19 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatRiskLabel(incident?: SecurityIncident) {
  if (!incident) return "No active threat";

  if (incident.severity === "Critical") return "CRITICAL";
  if (incident.severity === "High") return "HIGH";
  if (incident.severity === "Medium") return "MEDIUM";

  return incident.severity.toUpperCase();
}

function shortHash(value: string) {
  if (!value) return "—";
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

function Dashboard() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [resourceCount, setResourceCount] = useState<number | null>(null);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError(false);

        const [audit, security, resources, incidentResponse] =
          await Promise.all([
            getAuditEvents(),
            getSecurityCenter(),
            getResources(),
            getSecurityIncidents(),
          ]);

        if (!mounted) return;

        setEvents(audit.events ?? []);
        setSummary(security.summary);
        setResourceCount(resources.count);
        setIncidents(incidentResponse.incidents ?? []);
      } catch (loadError) {
        console.error("Failed to load dashboard:", loadError);

        if (mounted) {
          setError(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const latestIncident = incidents[0];

  const suspendedCount = useMemo(
    () => incidents.filter((incident) => incident.suspended).length,
    [incidents],
  );

  const criticalIncident = useMemo(
    () =>
      incidents.find(
        (incident) =>
          incident.severity === "Critical" ||
          incident.severity === "High",
      ),
    [incidents],
  );

  const riskIncident = criticalIncident ?? latestIncident;

  const riskScore = riskIncident?.risk_score ?? 0;

  const accessDecisions = summary
    ? summary.blocked_requests + summary.events_reviewed
    : 0;

  const postureLabel = formatRiskLabel(riskIncident);

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-area">
        <Topbar />

        <main className="tm-dashboard">
          {/* =====================================================
              HEADER
          ===================================================== */}

          <section className="tm-dashboard-header">
            <div>
              <div className="tm-eyebrow">
                <span className="tm-eyebrow-dot" />
                SECURITY COMMAND CENTER
              </div>

              <h1>Security posture</h1>

              <p>
                Real-time visibility across identity, authorization,
                checkpoints, risk, enforcement, and audit evidence.
              </p>
            </div>

            <div className="tm-live-indicator">
              <span />
              <div>
                <strong>PROTECTION ACTIVE</strong>
                <small>TrustMesh control plane</small>
              </div>
            </div>
          </section>

          {error && (
            <div className="tm-dashboard-error">
              <AlertIcon />
              <div>
                <strong>Security telemetry unavailable</strong>
                <span>
                  The dashboard could not load one or more live data sources.
                </span>
              </div>
            </div>
          )}

          {/* =====================================================
              THREAT OVERVIEW
          ===================================================== */}

          <section className="tm-threat-grid">
            <div className="tm-threat-card">
              <div className="tm-threat-card-glow" />

              <div className="tm-threat-top">
                <div className="tm-threat-label">
                  <span className="tm-threat-dot" />
                  CURRENT THREAT POSTURE
                </div>

                <span
                  className={`tm-threat-severity ${
                    riskIncident ? "is-danger" : "is-safe"
                  }`}
                >
                  {postureLabel}
                </span>
              </div>

              <div className="tm-threat-main">
                <div className="tm-risk-score">
                  {loading ? "—" : riskScore}
                  <span>/100</span>
                </div>

                <div className="tm-risk-copy">
                  <strong>
                    {riskIncident
                      ? "Active security signal detected"
                      : "No active threat detected"}
                  </strong>

                  <span>
                    {riskIncident
                      ? "TrustMesh has escalated suspicious activity through the security pipeline."
                      : "Identity, policy, checkpoint, and audit controls are operating normally."}
                  </span>
                </div>
              </div>

              <div className="tm-risk-meter">
                <span
                  style={
                    {
                      "--risk-width": `${Math.min(
                        Math.max(riskScore, 0),
                        100,
                      )}%`,
                    } as CSSProperties
                  }
                />
              </div>

              <div className="tm-threat-meta">
                <div>
                  <span>DECISION</span>
                  <strong>
                    {summary && summary.blocked_requests > 0
                      ? "DENY"
                      : "MONITOR"}
                  </strong>
                </div>

                <div>
                  <span>INCIDENTS</span>
                  <strong>{incidents.length}</strong>
                </div>

                <div>
                  <span>SUSPENDED</span>
                  <strong>{suspendedCount}</strong>
                </div>

                <div>
                  <span>AUDIT EVENTS</span>
                  <strong>{events.length}</strong>
                </div>
              </div>
            </div>

            <div className="tm-incident-card">
              <div className="tm-incident-card-top">
                <div>
                  <span className="tm-card-kicker">ACTIVE INCIDENT</span>
                  <h2>
                    {riskIncident
                      ? "Threat requiring attention"
                      : "No active incident"}
                  </h2>
                </div>

                <span
                  className={`tm-incident-icon ${
                    riskIncident ? "danger" : "safe"
                  }`}
                >
                  {riskIncident ? <AlertIcon /> : <CheckIcon />}
                </span>
              </div>

              {riskIncident ? (
                <>
                  <div className="tm-incident-severity">
                    <span />
                    {riskIncident.severity.toUpperCase()}
                  </div>

                  <p>
                    High-priority activity has crossed TrustMesh security
                    controls and requires investigation or enforcement.
                  </p>

                  <div className="tm-incident-facts">
                    <div>
                      <span>RISK</span>
                      <strong>{riskIncident.risk_score}/100</strong>
                    </div>

                    <div>
                      <span>STATE</span>
                      <strong>
                        {riskIncident.suspended ? "SUSPENDED" : "OPEN"}
                      </strong>
                    </div>
                  </div>

                  <Link className="tm-primary-link" to="/security">
                    Review incident
                    <ArrowIcon />
                  </Link>
                </>
              ) : (
                <>
                  <p>
                    TrustMesh has no active high-priority incident requiring
                    human intervention.
                  </p>

                  <Link className="tm-secondary-link" to="/security">
                    Open Security Center
                    <ArrowIcon />
                  </Link>
                </>
              )}
            </div>
          </section>

          {/* =====================================================
              OPERATING METRICS
          ===================================================== */}

          <section className="tm-metrics">
            <div className="tm-metric">
              <div className="tm-metric-icon">
                <IdentityIcon />
              </div>

              <div>
                <span>IDENTITIES</span>
                <strong>{loading ? "—" : "ACTIVE"}</strong>
                <small>DID identity layer</small>
              </div>
            </div>

            <div className="tm-metric">
              <div className="tm-metric-icon">
                <PolicyIcon />
              </div>

              <div>
                <span>ACCESS DECISIONS</span>
                <strong>{loading ? "—" : accessDecisions}</strong>
                <small>Authorization outcomes</small>
              </div>
            </div>

            <div className="tm-metric">
              <div className="tm-metric-icon">
                <ResourceIcon />
              </div>

              <div>
                <span>PROTECTED RESOURCES</span>
                <strong>{loading ? "—" : resourceCount ?? 0}</strong>
                <small>Policy-bound surfaces</small>
              </div>
            </div>

            <div className="tm-metric tm-metric-danger">
              <div className="tm-metric-icon">
                <ShieldIcon />
              </div>

              <div>
                <span>RESTRICTED IDENTITIES</span>
                <strong>{loading ? "—" : suspendedCount}</strong>
                <small>Adaptive enforcement</small>
              </div>
            </div>
          </section>

          {/* =====================================================
              SECURITY PIPELINE
          ===================================================== */}

          <section className="tm-panel tm-pipeline-panel">
            <div className="tm-panel-header">
              <div>
                <span className="tm-card-kicker">CONTROL PIPELINE</span>
                <h2>Request protection path</h2>
                <p>
                  Every sensitive request passes through independent security
                  controls before execution.
                </p>
              </div>

              <Link to="/policies" className="tm-panel-link">
                View policies
                <ArrowIcon />
              </Link>
            </div>

            <div className="tm-pipeline">
              <div className="tm-pipeline-step">
                <span>01</span>
                <div>
                  <strong>Identity</strong>
                  <small>Who is requesting?</small>
                </div>
              </div>

              <div className="tm-pipeline-line" />

              <div className="tm-pipeline-step">
                <span>02</span>
                <div>
                  <strong>Policy</strong>
                  <small>Is it authorized?</small>
                </div>
              </div>

              <div className="tm-pipeline-line" />

              <div className="tm-pipeline-step">
                <span>03</span>
                <div>
                  <strong>Checkpoint</strong>
                  <small>Does request pass?</small>
                </div>
              </div>

              <div className="tm-pipeline-line" />

              <div className="tm-pipeline-step tm-pipeline-risk">
                <span>04</span>
                <div>
                  <strong>Risk</strong>
                  <small>How dangerous?</small>
                </div>
              </div>

              <div className="tm-pipeline-line" />

              <div className="tm-pipeline-step">
                <span>05</span>
                <div>
                  <strong>Enforcement</strong>
                  <small>Allow or restrict</small>
                </div>
              </div>

              <div className="tm-pipeline-line" />

              <div className="tm-pipeline-step">
                <span>06</span>
                <div>
                  <strong>Audit</strong>
                  <small>Record evidence</small>
                </div>
              </div>
            </div>
          </section>

          {/* =====================================================
              LOWER COMMAND GRID
          ===================================================== */}

          <section className="tm-lower-grid">
            {/* LIVE ACTIVITY */}

            <div className="tm-panel tm-activity-panel">
              <div className="tm-panel-header">
                <div>
                  <span className="tm-card-kicker">LIVE TELEMETRY</span>
                  <h2>Security activity</h2>
                  <p>Latest events observed by the audit layer.</p>
                </div>

                <Link to="/audit" className="tm-panel-link">
                  Audit log
                  <ArrowIcon />
                </Link>
              </div>

              {loading ? (
                <div className="tm-loading-list">
                  <div />
                  <div />
                  <div />
                  <div />
                </div>
              ) : events.length === 0 ? (
                <div className="tm-empty">
                  <ActivityIcon />
                  <strong>No recent security events</strong>
                  <span>
                    Audit activity will appear here when events are indexed.
                  </span>
                </div>
              ) : (
                <div className="tm-activity-list">
                  {events.slice(0, 6).map((event, index) => {
                    const eventName = event.event_name || "Security event";

                    return (
                      <div
                        className="tm-activity-row"
                        key={`${event.transaction_hash}-${event.log_index}`}
                        style={
                          {
                            "--row-index": index,
                          } as CSSProperties
                        }
                      >
                        <div
                          className={`tm-activity-status ${
                            eventName.toLowerCase().includes("denied") ||
                            eventName.toLowerCase().includes("blocked")
                              ? "danger"
                              : "normal"
                          }`}
                        >
                          <span />
                        </div>

                        <div className="tm-activity-copy">
                          <strong>{eventName}</strong>

                          <span>
                            Block {event.block_number} ·{" "}
                            {shortHash(event.transaction_hash)}
                          </span>
                        </div>

                        <span className="tm-activity-type">
                          {eventName.toLowerCase().includes("denied") ||
                          eventName.toLowerCase().includes("blocked")
                            ? "DENIED"
                            : "RECORDED"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ACTIVE INCIDENT */}

            <div className="tm-panel tm-response-panel">
              <div className="tm-panel-header">
                <div>
                  <span className="tm-card-kicker">RESPONSE</span>
                  <h2>Incident response</h2>
                  <p>Current enforcement state.</p>
                </div>

                <span className="tm-response-shield">
                  <ShieldIcon />
                </span>
              </div>

              {riskIncident ? (
                <div className="tm-response-body">
                  <div className="tm-response-heading">
                    <span className="tm-response-severity">
                      {riskIncident.severity.toUpperCase()}
                    </span>

                    <span className="tm-response-risk">
                      RISK {riskIncident.risk_score}
                    </span>
                  </div>

                  <h3>Suspicious identity detected</h3>

                  <p>
                    TrustMesh has escalated the identity based on the current
                    security signal and adaptive enforcement state.
                  </p>

                  <div className="tm-response-state">
                    <div>
                      <span>ENFORCEMENT</span>
                      <strong>
                        {riskIncident.suspended ? "SUSPENDED" : "MONITORING"}
                      </strong>
                    </div>

                    <div>
                      <span>INCIDENTS</span>
                      <strong>{incidents.length}</strong>
                    </div>
                  </div>

                  <div className="tm-response-actions">
                    <Link to="/security" className="tm-response-primary">
                      Review incident
                      <ArrowIcon />
                    </Link>

                    <Link to="/recovery" className="tm-response-secondary">
                      Recovery
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="tm-response-safe">
                  <div>
                    <CheckIcon />
                  </div>

                  <strong>Protection operating normally</strong>

                  <span>
                    No high-priority identity currently requires adaptive
                    enforcement.
                  </span>

                  <Link to="/security">
                    Open Security Center
                    <ArrowIcon />
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* =====================================================
              FOOTER SIGNAL
          ===================================================== */}

          <section className="tm-command-footer">
            <div className="tm-command-footer-icon">
              <ShieldIcon />
            </div>

            <div>
              <strong>TrustMesh is enforcing security at the application layer.</strong>
              <span>
                Identity → authorization → checkpoint → risk → enforcement →
                audit.
              </span>
            </div>

            <Link to="/security">
              Security Center
              <ArrowIcon />
            </Link>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;