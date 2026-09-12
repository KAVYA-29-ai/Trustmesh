import { useEffect, useMemo, useState } from "react";
import { getAuditEvents } from "../services/audit";
import type { AuditEvent, AuditResponse } from "../types/api";
import Icon from "../components/ui/Icon";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";

function shorten(value: string, start = 10, end = 8) {
  if (!value || value.length <= start + end + 3) {
    return value;
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function formatTimestamp(timestamp: string | null) {
  if (!timestamp) {
    return "Unknown";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
}

function getEventData(
  event: AuditEvent,
  key: string,
): string {
  return String(event.data?.[key] ?? "—");
}

function getSeverity(event: AuditEvent) {
  return String(
    event.data?.severity ?? "indexed",
  ).toLowerCase();
}

function getResource(event: AuditEvent) {
  return String(
    event.data?.resource ??
      event.data?.resource_id ??
      "Indexed event",
  );
}

function getIdentity(event: AuditEvent) {
  return String(
    event.data?.subject ??
      event.data?.identity ??
      event.data?.did ??
      "Indexed event",
  );
}

function severityClass(severity: string) {
  if (
    severity === "critical" ||
    severity === "high"
  ) {
    return "audit-severity-danger";
  }

  if (severity === "medium") {
    return "audit-severity-warning";
  }

  if (severity === "low") {
    return "audit-severity-low";
  }

  return "audit-severity-neutral";
}

function EventData({
  event,
}: {
  event: AuditEvent;
}) {
  return (
    <details className="audit-details">
      <summary>
        <span>View event data</span>
        <span>+</span>
      </summary>

      <pre>
        {JSON.stringify(event.data, null, 2)}
      </pre>
    </details>
  );
}

export default function Audit() {
  const [response, setResponse] =
    useState<AuditResponse | null>(null);

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [resource, setResource] = useState("all");
  const [identity, setIdentity] = useState("all");

  const [view, setView] =
    useState<"table" | "timeline">("table");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAudit() {
      try {
        setLoading(true);
        setError("");

        const result = await getAuditEvents();

        if (!active) {
          return;
        }

        setResponse(result);
        setEvents(result.events);
      } catch {
        if (active) {
          setError(
            "Unable to load the audit log. Please try again.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
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
      const eventSeverity =
        getSeverity(event);

      const eventResource =
        getResource(event);

      const eventIdentity =
        getIdentity(event);

      const searchableValues = [
        event.event_name,
        event.transaction_hash,
        event.contract_address,
        String(event.block_number),
        String(event.log_index),
        eventSeverity,
        eventResource,
        eventIdentity,
        getEventData(event, "action"),
        getEventData(event, "decision"),
        getEventData(event, "description"),
      ];

      const matchesSearch =
        !query ||
        searchableValues.some((value) =>
          value.toLowerCase().includes(query),
        );

      return (
        matchesSearch &&
        (severity === "all" ||
          eventSeverity === severity) &&
        (resource === "all" ||
          eventResource === resource) &&
        (identity === "all" ||
          eventIdentity === identity)
      );
    });
  }, [
    events,
    search,
    severity,
    resource,
    identity,
  ]);

  const filterValues = useMemo(() => {
    const resources = new Set<string>();
    const identities = new Set<string>();
    const severities = new Set<string>();

    events.forEach((event) => {
      resources.add(getResource(event));
      identities.add(getIdentity(event));
      severities.add(getSeverity(event));
    });

    return {
      resources: [...resources].sort(),
      identities: [...identities].sort(),
      severities: [...severities].sort(),
    };
  }, [events]);

  const eventVolumes = useMemo(() => {
    const counts = new Map<string, number>();

    filteredEvents.forEach((event) => {
      counts.set(
        event.event_name,
        (counts.get(event.event_name) ?? 0) + 1,
      );
    });

    return [...counts.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
  }, [filteredEvents]);

  const criticalEvents = useMemo(
    () =>
      events.filter((event) => {
        const severity = getSeverity(event);

        return (
          severity === "critical" ||
          severity === "high"
        );
      }).length,
    [events],
  );

  const deniedEvents = useMemo(
    () =>
      events.filter((event) => {
        const decision =
          getEventData(event, "decision")
            .toLowerCase();

        const status =
          getEventData(event, "status")
            .toLowerCase();

        return (
          decision === "deny" ||
          decision === "denied" ||
          status === "blocked" ||
          status === "denied"
        );
      }).length,
    [events],
  );

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-area">
        <Topbar />

        <main className="dashboard audit-page">
          <section className="page-header">
            <div>
              <span className="eyebrow">
                SECURITY TELEMETRY
              </span>

              <h1>Audit Log</h1>

              <p>
                Trace security decisions, access events,
                policy outcomes, and enforcement activity
                across TrustMesh.
              </p>
            </div>

            <div className="audit-status">
              <span className="status-dot" />

              <span>
                {response?.status === "ready"
                  ? "Audit pipeline operational"
                  : "Audit service"}
              </span>
            </div>
          </section>

          <section className="audit-summary-grid">
            <article className="panel audit-summary-card">
              <div className="audit-summary-icon">
                <Icon
                  name="database"
                  size={20}
                />
              </div>

              <div>
                <span>Indexed events</span>

                <strong>
                  {loading
                    ? "—"
                    : response?.count ?? 0}
                </strong>

                <small>
                  Total security records
                </small>
              </div>
            </article>

            <article className="panel audit-summary-card">
              <div className="audit-summary-icon">
                <Icon
                  name="shield"
                  size={20}
                />
              </div>

              <div>
                <span>High-risk events</span>

                <strong>
                  {loading
                    ? "—"
                    : criticalEvents}
                </strong>

                <small>
                  High and critical severity
                </small>
              </div>
            </article>

            <article className="panel audit-summary-card">
              <div className="audit-summary-icon">
                <Icon
                  name="check"
                  size={20}
                />
              </div>

              <div>
                <span>Denied activity</span>

                <strong>
                  {loading
                    ? "—"
                    : deniedEvents}
                </strong>

                <small>
                  Blocked or denied decisions
                </small>
              </div>
            </article>

            <article className="panel audit-summary-card">
              <div className="audit-summary-icon">
                <Icon
                  name="database"
                  size={20}
                />
              </div>

              <div>
                <span>Integrity</span>

                <strong>Verified</strong>

                <small>
                  Indexed event records
                </small>
              </div>
            </article>
          </section>

          <section className="panel audit-panel">
            <div className="audit-toolbar">
              <div>
                <span className="panel-kicker">
                  EVENT STREAM
                </span>

                <h2>Security event history</h2>

                <p>
                  {loading
                    ? "Loading indexed events..."
                    : `${filteredEvents.length} event${
                        filteredEvents.length === 1
                          ? ""
                          : "s"
                      } currently shown`}
                </p>
              </div>

              <label className="audit-search">
                <Icon
                  name="search"
                  size={17}
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search events, identity, resource, transaction..."
                  aria-label="Search audit events"
                />
              </label>
            </div>

            <div className="audit-filter-row">
              <select
                value={severity}
                onChange={(event) =>
                  setSeverity(event.target.value)
                }
                aria-label="Filter by severity"
              >
                <option value="all">
                  All severity
                </option>

                {filterValues.severities.map(
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value}
                    </option>
                  ),
                )}
              </select>

              <select
                value={resource}
                onChange={(event) =>
                  setResource(event.target.value)
                }
                aria-label="Filter by resource"
              >
                <option value="all">
                  All resources
                </option>

                {filterValues.resources.map(
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value}
                    </option>
                  ),
                )}
              </select>

              <select
                value={identity}
                onChange={(event) =>
                  setIdentity(event.target.value)
                }
                aria-label="Filter by identity"
              >
                <option value="all">
                  All identities
                </option>

                {filterValues.identities.map(
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value}
                    </option>
                  ),
                )}
              </select>

              <div
                className="audit-view-toggle"
                aria-label="Audit view"
              >
                <button
                  type="button"
                  className={
                    view === "table"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setView("table")
                  }
                >
                  Table
                </button>

                <button
                  type="button"
                  className={
                    view === "timeline"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setView("timeline")
                  }
                >
                  Timeline
                </button>
              </div>
            </div>

            {!loading &&
              !error &&
              filteredEvents.length > 0 && (
                <div className="audit-volume">
                  <div className="audit-volume-heading">
                    <div>
                      <span className="panel-kicker">
                        EVENT VOLUME
                      </span>

                      <strong>
                        Activity by event type
                      </strong>
                    </div>

                    <span>
                      Current filtered result set
                    </span>
                  </div>

                  <div className="audit-volume-bars">
                    {eventVolumes.map(
                      ([name, count]) => (
                        <div
                          className="audit-volume-bar"
                          key={name}
                        >
                          <div className="audit-volume-track">
                            <span
                              style={{
                                height: `${Math.max(
                                  12,
                                  (count /
                                    (eventVolumes[0]?.[1] ??
                                      1)) *
                                    100,
                                )}%`,
                              }}
                            />
                          </div>

                          <small>{name}</small>

                          <b>{count}</b>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

            {loading && (
              <div
                className="audit-loading"
                aria-label="Loading audit events"
              >
                {[1, 2, 3, 4, 5].map(
                  (item) => (
                    <div
                      className="audit-skeleton-row"
                      key={item}
                    >
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                  ),
                )}
              </div>
            )}

            {!loading && error && (
              <div className="audit-state audit-error-state">
                <Icon
                  name="shield"
                  size={24}
                />

                <h3>
                  Audit log unavailable
                </h3>

                <p>{error}</p>
              </div>
            )}

            {!loading &&
              !error &&
              events.length === 0 && (
                <div className="audit-state">
                  <Icon
                    name="database"
                    size={28}
                  />

                  <h3>
                    No audit events yet
                  </h3>

                  <p>
                    Security activity will appear
                    here when events are recorded.
                  </p>
                </div>
              )}

            {!loading &&
              !error &&
              events.length > 0 &&
              filteredEvents.length === 0 && (
                <div className="audit-state">
                  <Icon
                    name="search"
                    size={28}
                  />

                  <h3>
                    No matching events
                  </h3>

                  <p>
                    Adjust the search or filters
                    to find another event.
                  </p>
                </div>
              )}

            {!loading &&
              !error &&
              filteredEvents.length > 0 &&
              view === "table" && (
                <div className="audit-table-wrap">
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>EVENT</th>
                        <th>SEVERITY</th>
                        <th>IDENTITY</th>
                        <th>RESOURCE</th>
                        <th>DECISION</th>
                        <th>TIMESTAMP</th>
                        <th>DETAILS</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredEvents.map(
                        (event, index) => {
                          const eventSeverity =
                            getSeverity(event);

                          const decision =
                            getEventData(
                              event,
                              "decision",
                            );

                          return (
                            <tr
                              key={`${event.transaction_hash}:${event.log_index}:${index}`}
                            >
                              <td>
                                <div className="audit-event-name">
                                  <span className="audit-event-marker" />

                                  <div>
                                    <strong>
                                      {event.event_name}
                                    </strong>

                                    <small>
                                      Block{" "}
                                      {
                                        event.block_number
                                      }
                                      {" · "}
                                      Log{" "}
                                      {event.log_index}
                                    </small>
                                  </div>
                                </div>
                              </td>

                              <td>
                                <span
                                  className={`audit-severity ${severityClass(
                                    eventSeverity,
                                  )}`}
                                >
                                  {eventSeverity}
                                </span>
                              </td>

                              <td>
                                <div className="audit-identity-cell">
                                  <strong>
                                    {shorten(
                                      getIdentity(
                                        event,
                                      ),
                                      12,
                                      6,
                                    )}
                                  </strong>

                                  <small>
                                    Subject identity
                                  </small>
                                </div>
                              </td>

                              <td>
                                <span className="audit-resource-cell">
                                  {getResource(
                                    event,
                                  )}
                                </span>
                              </td>

                              <td>
                                <span
                                  className={`audit-decision ${
                                    decision
                                      .toLowerCase()
                                      .includes(
                                        "deny",
                                      ) ||
                                    decision
                                      .toLowerCase()
                                      .includes(
                                        "block",
                                      )
                                      ? "audit-decision-denied"
                                      : "audit-decision-default"
                                  }`}
                                >
                                  {decision === "—"
                                    ? "Indexed"
                                    : decision}
                                </span>
                              </td>

                              <td>
                                <span className="audit-timestamp">
                                  {formatTimestamp(
                                    event.timestamp,
                                  )}
                                </span>
                              </td>

                              <td>
                                <EventData
                                  event={event}
                                />
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              )}

            {!loading &&
              !error &&
              filteredEvents.length > 0 &&
              view === "timeline" && (
                <div className="audit-timeline">
                  {filteredEvents.map(
                    (event, index) => {
                      const eventSeverity =
                        getSeverity(event);

                      return (
                        <article
                          className="audit-timeline-item"
                          key={`${event.transaction_hash}:timeline:${index}`}
                        >
                          <span
                            className={`audit-timeline-marker ${severityClass(
                              eventSeverity,
                            )}`}
                          />

                          <div className="audit-timeline-content">
                            <div className="audit-timeline-top">
                              <div>
                                <span className="panel-kicker">
                                  {eventSeverity}
                                </span>

                                <strong>
                                  {event.event_name}
                                </strong>
                              </div>

                              <time>
                                {formatTimestamp(
                                  event.timestamp,
                                )}
                              </time>
                            </div>

                            <p>
                              {getEventData(
                                event,
                                "description",
                              ) === "—"
                                ? "Security event recorded by the TrustMesh audit pipeline."
                                : getEventData(
                                    event,
                                    "description",
                                  )}
                            </p>

                            <div className="audit-timeline-meta">
                              <span>
                                <b>Identity</b>
                                {shorten(
                                  getIdentity(
                                    event,
                                  ),
                                  14,
                                  6,
                                )}
                              </span>

                              <span>
                                <b>Resource</b>
                                {getResource(
                                  event,
                                )}
                              </span>

                              <span>
                                <b>Decision</b>
                                {getEventData(
                                  event,
                                  "decision",
                                )}
                              </span>

                              <code>
                                {shorten(
                                  event.transaction_hash,
                                )}
                              </code>
                            </div>
                          </div>
                        </article>
                      );
                    },
                  )}
                </div>
              )}
          </section>

          {!loading &&
            !error &&
            filteredEvents.length > 0 && (
              <section className="audit-integrity-grid">
                <article className="panel audit-integrity-card">
                  <div className="audit-integrity-mark">
                    <Icon
                      name="shield"
                      size={20}
                    />
                  </div>

                  <div>
                    <span className="panel-kicker">
                      TRACEABILITY
                    </span>

                    <h3>
                      Every decision leaves evidence
                    </h3>

                    <p>
                      Identity, resource, decision,
                      transaction, and event metadata
                      remain available for investigation.
                    </p>
                  </div>
                </article>

                <article className="panel audit-integrity-card">
                  <div className="audit-integrity-mark">
                    <Icon
                      name="database"
                      size={20}
                    />
                  </div>

                  <div>
                    <span className="panel-kicker">
                      SECURITY PIPELINE
                    </span>

                    <h3>
                      Detect → Record → Investigate
                    </h3>

                    <p>
                      Audit records provide the evidence
                      layer for risk analysis, incidents,
                      and human security decisions.
                    </p>
                  </div>
                </article>
              </section>
            )}
        </main>
      </div>
    </div>
  );
}