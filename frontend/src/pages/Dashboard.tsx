import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import StatCard from "../components/ui/StatCard";
import StatusBadge from "../components/ui/StatusBadge";
import { getAuditEvents } from "../services/audit";
import { getResources } from "../services/resources";
import { getSecurityCenter } from "../services/security";
import { getSecurityIncidents } from "../services/security";
import type { AuditEvent, SecurityIncident, SecuritySummary } from "../types/api";

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 20 6v5c0 5-3.2 8-8 10-4.8-2-8-5-8-10V6l8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IdentityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

function PolicyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m12 3 7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4Z" />
      <path d="M8.5 12h7M12 8.5v7" />
    </svg>
  );
}

function ResourceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4.5 7.5 7.5 4 7.5-4M12 12v9" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12h4l2-6 4 12 2-6h6" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h9M8 4l4 4-4 4" />
    </svg>
  );
}

function Dashboard() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [resourceCount, setResourceCount] = useState<number | null>(null);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [audit, security, resources, incidentResponse] = await Promise.all([
          getAuditEvents(),
          getSecurityCenter(),
          getResources(),
          getSecurityIncidents(),
        ]);
        setEvents(audit.events);
        setSummary(security.summary);
        setResourceCount(resources.count);
        setIncidents(incidentResponse.incidents);
      } catch (error) {
        console.error("Failed to load audit events:", error);
      } finally {
        setAuditLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const latestIncident = incidents[0];
  const suspendedCount = incidents.filter((incident) => incident.suspended).length;
  const currentRisk = latestIncident && (latestIncident.severity === "Critical" || latestIncident.severity === "High")
    ? latestIncident
    : null;
  const accessDecisions = summary ? summary.blocked_requests + summary.events_reviewed : null;

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-area">
        <Topbar />

        <main className="dashboard">
          <section className="page-heading dashboard-heading">
            <div>
              <div className="eyebrow">CONTROL PLANE</div>

              <h1>TrustMesh security posture</h1>

              <p>
                A live operating view across identity, access, risk, and audit.
              </p>
            </div>

            <div className="dashboard-status">
              <span className="status-pulse" />
              <span>TrustMesh operational</span>
            </div>
          </section>

          <section className="stats-grid dashboard-stats dashboard-posture-stats">
            <StatCard
              label="ACTIVE IDENTITIES"
              value="Ready"
              detail="DID verification available"
              icon={<IdentityIcon />}
              state="ready"
            />

            <StatCard
              label="ACCESS DECISIONS"
              value={accessDecisions === null ? "Ready" : String(accessDecisions)}
              detail={accessDecisions === null ? "Policy authorization available" : "Indexed authorization outcomes"}
              icon={<PolicyIcon />}
              state="ready"
            />

            <StatCard
              label="PROTECTED RESOURCES"
              value={resourceCount === null ? "Ready" : String(resourceCount)}
              detail="Protected resources"
              icon={<ResourceIcon />}
              state="ready"
            />

            <StatCard
              label="ACTIVE INCIDENTS"
              value={summary === null ? "Ready" : incidents.length === 0 ? "None" : String(incidents.length)}
              detail={
                summary === null ? "Incident monitoring available" : incidents.length === 0 ? "No active incidents" : "Open security incidents"
              }
              icon={<ActivityIcon />}
              state="ready"
            />

            <StatCard
              label="SUSPENDED IDENTITIES"
              value={summary === null ? "Ready" : suspendedCount === 0 ? "None" : String(suspendedCount)}
              detail={summary === null ? "Adaptive response available" : suspendedCount === 0 ? "No suspended identities" : "Restricted by adaptive response"}
              icon={<ShieldIcon />}
              state="ready"
            />

            <StatCard
              label="RECENT SECURITY EVENTS"
              value={auditLoading ? "Loading" : events.length === 0 ? "None" : String(events.length)}
              detail={auditLoading ? "Reading audit telemetry" : events.length === 0 ? "No recent violations" : "Indexed security events"}
              icon={<ActivityIcon />}
              state="ready"
            />
          </section>

          <section className="dashboard-risk-banner">
            <div>
              <span className="panel-kicker">SECURITY POSTURE</span>
              <strong>{currentRisk ? currentRisk.severity.toUpperCase() : "LOW RISK"}{currentRisk && <small>{currentRisk.risk_score}/100</small>}</strong>
              <span>{currentRisk ? "Active threat requires investigation" : "No active threats detected"}</span>
            </div>
            <Link className="secondary-action" to="/security">Open Security Center<ArrowIcon /></Link>
          </section>

          <section className="content-grid dashboard-content">
            <div className="panel activity-panel">
              <div className="panel-header">
                <div>
                  <div className="panel-kicker">AUDIT / LIVE</div>
                  <h2>Live security activity</h2>
                  <p className="panel-description">
                    Latest evidence observed by the TrustMesh audit pipeline.
                  </p>
                </div>

                <Link className="text-button" to="/audit">
                  View audit log
                  <ArrowIcon />
                </Link>
              </div>

              {auditLoading ? (
                <div className="activity-skeleton" aria-label="Loading activity">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div className="activity-skeleton-row" key={index}>
                      <span />
                      <div>
                        <span />
                        <span />
                      </div>
                      <span />
                    </div>
                  ))}
                </div>
              ) : events.length === 0 ? (
                <div className="empty-state dashboard-empty">
                  <div className="empty-icon">
                    <ActivityIcon />
                  </div>

                  <h3>No indexed activity yet</h3>

                  <p>
                    Blockchain audit events will appear here once the
                    finalized contract indexer is connected.
                  </p>

                  <Link className="secondary-action" to="/audit">
                    Open audit log
                    <ArrowIcon />
                  </Link>
                </div>
              ) : (
                <div className="activity-list">
                  {events.slice(0, 6).map((event, index) => (
                    <div
                      className="activity-row"
                      key={`${event.transaction_hash}-${event.log_index}`}
                      style={{ "--activity-index": index } as React.CSSProperties}
                    >
                      <div className="activity-marker">
                        <span />
                      </div>

                      <div className="activity-main">
                        <strong>{event.event_name}</strong>

                        <span>
                          Block {event.block_number} ·{" "}
                          {event.transaction_hash.slice(0, 10)}…
                        </span>
                      </div>

                      <span className="activity-action">
                        <span>Indexed</span>
                        <ArrowIcon />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="panel security-panel dashboard-security-panel">
              <div className="panel-header">
                <div>
                  <div className="panel-kicker">SECURITY</div>

                  <h2>TrustMesh security layers</h2>

                  <p className="panel-description">
                    Independent controls working across the platform.
                  </p>
                </div>

                <div className="security-shield">
                  <ShieldIcon />
                </div>
              </div>

              <div className="security-list">
                <div className="security-row">
                  <div>
                    <strong>Identity</strong>
                    <span>DID verification</span>
                  </div>

                  <StatusBadge>Ready</StatusBadge>
                </div>

                <div className="security-row">
                  <div>
                    <strong>Access Control</strong>
                    <span>PolicyEngine authorization</span>
                  </div>

                  <StatusBadge>Ready</StatusBadge>
                </div>

                <div className="security-row">
                  <div>
                    <strong>Audit</strong>
                    <span>Immutable security events</span>
                  </div>

                  <StatusBadge>Active</StatusBadge>
                </div>

                <div className="security-row">
                  <div>
                    <strong>Adaptive Security</strong>
                    <span>Risk-based response</span>
                  </div>

                  <StatusBadge>Active</StatusBadge>
                </div>
              </div>

              <div className="security-footer">
                <span className="security-footer-icon">
                  <ShieldIcon />
                </span>
                <span>Security controls are evaluated independently.</span>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
