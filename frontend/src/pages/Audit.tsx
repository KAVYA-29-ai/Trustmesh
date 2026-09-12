import { useEffect, useMemo, useState } from "react";
import { getAuditEvents } from "../services/audit";
import type { AuditEvent, AuditResponse } from "../types/api";
import Icon from "../components/ui/Icon";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";

function shorten(value: string, start = 10, end = 8) {
  if (!value || value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function formatTimestamp(timestamp: string | null) {
  if (!timestamp) return "Unknown";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString();
}

function EventData({ event }: { event: AuditEvent }) {
  return (
    <details className="audit-details">
      <summary>View event data</summary>
      <pre>{JSON.stringify(event.data, null, 2)}</pre>
    </details>
  );
}

export default function Audit() {
  const [response, setResponse] = useState<AuditResponse | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [resource, setResource] = useState("all");
  const [identity, setIdentity] = useState("all");
  const [view, setView] = useState<"table" | "timeline">("table");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAudit() {
      try {
        setLoading(true);
        setError("");
        const result = await getAuditEvents();

        if (!active) return;

        setResponse(result);
        setEvents(result.events);
      } catch {
        if (active) {
          setError("Unable to load the audit log. Please try again.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAudit();

    return () => {
      active = false;
    };
  }, []);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((event) => {
      const data = event.data || {};
      const eventSeverity = String(data.severity || "indexed").toLowerCase();
      const eventResource = String(data.resource || data.resource_id || "all");
      const eventIdentity = String(data.subject || data.identity || data.did || "all");

      return (severity === "all" || eventSeverity === severity) &&
        (resource === "all" || eventResource === resource) &&
        (identity === "all" || eventIdentity === identity) &&
        [
        event.event_name,
        event.transaction_hash,
        event.contract_address,
        String(event.block_number),
        String(event.log_index),
        ].some((value) => !query || value.toLowerCase().includes(query));
    });
  }, [events, search, severity, resource, identity]);

  const filterValues = useMemo(() => {
    const resources = new Set<string>();
    const identities = new Set<string>();
    const severities = new Set<string>();
    events.forEach((event) => {
      const data = event.data || {};
      resources.add(String(data.resource || data.resource_id || "Indexed event"));
      identities.add(String(data.subject || data.identity || data.did || "Indexed event"));
      severities.add(String(data.severity || "indexed").toLowerCase());
    });
    return { resources: [...resources].sort(), identities: [...identities].sort(), severities: [...severities].sort() };
  }, [events]);

  const eventVolumes = useMemo(() => {
    const counts = new Map<string, number>();
    filteredEvents.forEach((event) => counts.set(event.event_name, (counts.get(event.event_name) ?? 0) + 1));
    return [...counts.entries()].sort(([, a], [, b]) => b - a).slice(0, 8);
  }, [filteredEvents]);

  function eventData(event: AuditEvent, key: string): string {
    return String(event.data?.[key] ?? "—");
  }

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-area">
        <Topbar />

        <main className="dashboard audit-page">
          <div className="page-header">
            <div>
              <span className="eyebrow">IMMUTABLE RECORD</span>
              <h1>Audit Log</h1>
              <p>
                Verifiable blockchain events indexed by TrustLayer for security and
                accountability.
              </p>
            </div>

            <div className="audit-status">
              <span className="status-dot" />
              {response?.status === "ready" ? "Service ready" : "Audit service"}
            </div>
          </div>

          <section className="audit-summary-grid">
            <article className="panel audit-summary-card">
              <div className="audit-summary-icon">
                <Icon name="database" size={20} />
              </div>
              <div>
                <span>Total events</span>
                <strong>{loading ? "—" : response?.count ?? 0}</strong>
              </div>
            </article>

            <article className="panel audit-summary-card">
              <div className="audit-summary-icon">
                <Icon name="check" size={20} />
              </div>
              <div>
                <span>Integrity status</span>
                <strong>Verified</strong>
              </div>
            </article>

            <article className="panel audit-summary-card">
              <div className="audit-summary-icon">
                <Icon name="shield" size={20} />
              </div>
              <div>
                <span>Record type</span>
                <strong>On-chain</strong>
              </div>
            </article>
          </section>

          <section className="panel audit-panel">
            <div className="audit-toolbar">
            <div>
              <h2>Event history</h2>
              <p>
                {loading
                  ? "Loading indexed events..."
                  : `${filteredEvents.length} event${filteredEvents.length === 1 ? "" : "s"} shown`}
              </p>
            </div>

            <label className="audit-search">
              <Icon name="search" size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search events, transaction, block..."
                aria-label="Search audit events"
              />
            </label>
          </div>

          <div className="audit-filter-row">
            <select value={severity} onChange={(event) => setSeverity(event.target.value)} aria-label="Filter by severity">
              <option value="all">All severity</option>
              {filterValues.severities.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <select value={resource} onChange={(event) => setResource(event.target.value)} aria-label="Filter by resource">
              <option value="all">All resources</option>
              {filterValues.resources.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <select value={identity} onChange={(event) => setIdentity(event.target.value)} aria-label="Filter by identity">
              <option value="all">All identities</option>
              {filterValues.identities.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <div className="audit-view-toggle" aria-label="Audit view">
              <button type="button" className={view === "table" ? "active" : ""} onClick={() => setView("table")}>Table</button>
              <button type="button" className={view === "timeline" ? "active" : ""} onClick={() => setView("timeline")}>Timeline</button>
            </div>
          </div>

          {!loading && !error && filteredEvents.length > 0 && (
            <div className="audit-volume">
              <div className="audit-volume-heading"><div><span className="panel-kicker">EVENT VOLUME</span><strong>Indexed events by type</strong></div><span>Derived from current result set</span></div>
              <div className="audit-volume-bars">
                {eventVolumes.map(([name, count]) => <div className="audit-volume-bar" key={name}><span style={{ height: `${Math.max(12, (count / (eventVolumes[0]?.[1] ?? 1)) * 100)}%` }} /><small>{name}</small><b>{count}</b></div>)}
              </div>
            </div>
          )}

          {loading && (
            <div className="audit-loading" aria-label="Loading audit events">
              {[1, 2, 3, 4].map((item) => (
                <div className="audit-skeleton-row" key={item}>
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="audit-state audit-error-state">
              <Icon name="shield" size={24} />
              <h3>Audit log unavailable</h3>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && events.length === 0 && (
            <div className="audit-state">
              <Icon name="database" size={28} />
              <h3>No audit events yet</h3>
              <p>
                Indexed blockchain activity will appear here when events are
                recorded.
              </p>
            </div>
          )}

          {!loading && !error && events.length > 0 && filteredEvents.length === 0 && (
            <div className="audit-state">
              <Icon name="search" size={28} />
              <h3>No matching events</h3>
              <p>Try a different event name, transaction hash, or block number.</p>
            </div>
          )}

          {!loading && !error && filteredEvents.length > 0 && view === "table" && (
            <div className="audit-table-wrap">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Transaction</th>
                    <th>Contract</th>
                    <th>Block</th>
                    <th>Log index</th>
                    <th>Timestamp</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event, index) => (
                    <tr key={`${event.transaction_hash}:${event.log_index}:${index}`}>
                      <td>
                        <div className="audit-event-name">
                          <span className="audit-event-marker" />
                          <strong>{event.event_name}</strong>
                        </div>
                      </td>
                      <td>
                        <code>{shorten(event.transaction_hash)}</code>
                      </td>
                      <td>
                        <code>{shorten(event.contract_address)}</code>
                      </td>
                      <td>{event.block_number}</td>
                      <td>{event.log_index}</td>
                      <td>{formatTimestamp(event.timestamp)}</td>
                      <td>
                        <EventData event={event} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && filteredEvents.length > 0 && view === "timeline" && (
            <div className="audit-timeline">
              {filteredEvents.map((event, index) => (
                <article className="audit-timeline-item" key={`${event.transaction_hash}:timeline:${index}`}>
                  <span className="audit-timeline-marker" />
                  <div className="audit-timeline-content"><div><strong>{event.event_name}</strong><span>{formatTimestamp(event.timestamp)}</span></div><p>{eventData(event, "description")}</p><div className="audit-timeline-meta"><span>{eventData(event, "decision")}</span><span>{eventData(event, "resource")}</span><code>{shorten(event.transaction_hash)}</code></div></div>
                </article>
              ))}
            </div>
          )}
          </section>
        </main>
      </div>
    </div>
  );
}