import { useMemo, useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import StatusBadge from "../components/ui/StatusBadge";
import Icon from "../components/ui/Icon";

type IdentityStatus = "Verified" | "Pending" | "Suspended" | "Blocked";

interface Identity {
  did: string;
  name: string;
  role: string;
  status: IdentityStatus;
  risk: number;
  lastActive: string;
  activity: string;
}

const demoIdentities: Identity[] = [
  {
    did: "did:trust:7f3a...91c2",
    name: "System Administrator",
    role: "Administrator",
    status: "Verified",
    risk: 8,
    lastActive: "2 min ago",
    activity: "Normal administrative activity",
  },
  {
    did: "did:trust:4b82...3e17",
    name: "Security Analyst",
    role: "Security Analyst",
    status: "Verified",
    risk: 12,
    lastActive: "18 min ago",
    activity: "Reviewed security incidents",
  },
  {
    did: "did:trust:91de...72af",
    name: "Application Developer",
    role: "Developer",
    status: "Verified",
    risk: 18,
    lastActive: "1 hr ago",
    activity: "Accessed development resources",
  },
  {
    did: "did:trust:2c61...8ab4",
    name: "Read Only User",
    role: "Viewer",
    status: "Pending",
    risk: 22,
    lastActive: "3 hrs ago",
    activity: "Verification pending",
  },
  {
    did: "did:trust:a82e...51d9",
    name: "Suspicious Employee",
    role: "Employee",
    status: "Suspended",
    risk: 95,
    lastActive: "4 min ago",
    activity: "Repeated protected-action violations",
  },
  {
    did: "did:trust:c14f...82aa",
    name: "Restricted Account",
    role: "Employee",
    status: "Blocked",
    risk: 100,
    lastActive: "27 min ago",
    activity: "Security policy enforcement",
  },
];

function statusVariant(status: IdentityStatus) {
  switch (status) {
    case "Verified":
      return "success";

    case "Pending":
      return "warning";

    case "Suspended":
    case "Blocked":
      return "danger";

    default:
      return "warning";
  }
}

function riskLabel(risk: number) {
  if (risk >= 90) return "Critical";
  if (risk >= 70) return "High";
  if (risk >= 40) return "Elevated";
  return "Low";
}

function Identities() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | IdentityStatus>("All");

  const verifiedCount = demoIdentities.filter(
    (identity) => identity.status === "Verified",
  ).length;

  const restrictedCount = demoIdentities.filter(
    (identity) =>
      identity.status === "Suspended" || identity.status === "Blocked",
  ).length;

  const criticalCount = demoIdentities.filter(
    (identity) => identity.risk >= 90,
  ).length;

  const filteredIdentities = useMemo(() => {
    const query = search.trim().toLowerCase();

    return demoIdentities.filter((identity) => {
      const matchesSearch =
        !query ||
        `${identity.did} ${identity.name} ${identity.role} ${identity.status}`
          .toLowerCase()
          .includes(query);

      const matchesFilter =
        filter === "All" || identity.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-area">
        <Topbar />

        <main className="page">
          <header className="page-header">
            <div className="page-header-copy">
              <div className="page-eyebrow">IDENTITY CONTROL</div>

              <h1 className="page-title">Identities</h1>

              <p className="page-description">
                Monitor trusted identities, role assignments, risk state,
                and adaptive enforcement across the organization.
              </p>
            </div>

            <div className="page-actions">
              <button type="button" className="btn btn-primary">
                <Icon name="identity" />
                Register identity
              </button>
            </div>
          </header>

          <section className="metric-strip">
            <div className="metric-card">
              <div className="metric-label">Total identities</div>

              <div className="metric-value">
                {demoIdentities.length}
              </div>

              <div className="metric-meta">
                Registered identity records
              </div>
            </div>

            <div className="metric-card success">
              <div className="metric-label">Verified</div>

              <div className="metric-value">{verifiedCount}</div>

              <div className="metric-meta">
                Identity verification successful
              </div>
            </div>

            <div className="metric-card danger">
              <div className="metric-label">Restricted</div>

              <div className="metric-value">{restrictedCount}</div>

              <div className="metric-meta">
                Suspended or blocked identities
              </div>
            </div>
          </section>

          <section className="panel" style={{ marginTop: 14 }}>
            <div className="panel-header">
              <div>
                <div className="panel-kicker">IDENTITY DIRECTORY</div>

                <h2>Organization identities</h2>

                <p className="panel-description">
                  Identity state is evaluated before protected actions are
                  authorized.
                </p>
              </div>

              {criticalCount > 0 && (
                <span className="badge badge-critical">
                  {criticalCount} critical
                </span>
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                padding: "16px 20px",
                borderBottom: "1px solid #151c22",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  flex: "1 1 280px",
                  position: "relative",
                }}
              >
                <Icon name="search" />

                <input
                  className="input"
                  style={{ paddingLeft: 36 }}
                  type="search"
                  placeholder="Search identity, DID, role, or status..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <select
                className="input"
                style={{ width: 170 }}
                value={filter}
                onChange={(event) =>
                  setFilter(
                    event.target.value as "All" | IdentityStatus,
                  )
                }
              >
                <option value="All">All identities</option>
                <option value="Verified">Verified</option>
                <option value="Pending">Pending</option>
                <option value="Suspended">Suspended</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Identity</th>
                    <th>Role</th>
                    <th>Risk</th>
                    <th>Status</th>
                    <th>Last active</th>
                    <th>Activity</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredIdentities.map((identity) => (
                    <tr key={identity.did}>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              display: "grid",
                              placeItems: "center",
                              flexShrink: 0,
                              border: "1px solid #27313a",
                              borderRadius: 7,
                              background: "#11161b",
                              color: "#aeb8c1",
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            ID
                          </div>

                          <div>
                            <div
                              style={{
                                color: "#d5dce2",
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              {identity.name}
                            </div>

                            <div
                              style={{
                                marginTop: 3,
                                color: "#596570",
                                fontFamily: "monospace",
                                fontSize: 9,
                              }}
                            >
                              {identity.did}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span style={{ color: "#aeb8c1" }}>
                          {identity.role}
                        </span>
                      </td>

                      <td>
                        <div>
                          <div
                            style={{
                              color:
                                identity.risk >= 90
                                  ? "#ff7180"
                                  : identity.risk >= 70
                                    ? "#ffbf69"
                                    : "#9ba6b0",
                              fontFamily: "Space Grotesk, sans-serif",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {identity.risk}
                          </div>

                          <div
                            style={{
                              marginTop: 2,
                              color: "#596570",
                              fontSize: 8,
                              textTransform: "uppercase",
                              letterSpacing: "0.07em",
                            }}
                          >
                            {riskLabel(identity.risk)}
                          </div>
                        </div>
                      </td>

                      <td>
                        <StatusBadge variant={statusVariant(identity.status)}>
                          {identity.status}
                        </StatusBadge>
                      </td>

                      <td>
                        <span
                          style={{
                            color: "#7b8791",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {identity.lastActive}
                        </span>
                      </td>

                      <td>
                        <span
                          style={{
                            color:
                              identity.status === "Suspended" ||
                              identity.status === "Blocked"
                                ? "#ff7180"
                                : "#74808a",
                          }}
                        >
                          {identity.activity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredIdentities.length === 0 && (
                <div className="empty-state">
                  <Icon name="identity" />

                  <p>No identities match the current search.</p>
                </div>
              )}
            </div>
          </section>

          <section
            className="panel"
            style={{
              marginTop: 14,
              background:
                "linear-gradient(180deg, #0e1318 0%, #0c1014 100%)",
            }}
          >
            <div className="panel-header">
              <div>
                <div className="panel-kicker">ENFORCEMENT MODEL</div>

                <h2>Identity state controls access</h2>

                <p className="panel-description">
                  A protected action must pass identity state before policy
                  authorization can complete.
                </p>
              </div>

              <span className="badge badge-safe">ACTIVE</span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, minmax(0, 1fr))",
              }}
            >
              {[
                ["01", "Verified", "Normal access"],
                ["02", "Pending", "Limited access"],
                ["03", "Suspended", "Access rejected"],
                ["04", "Blocked", "Access denied"],
              ].map(([number, title, description]) => (
                <div
                  key={number}
                  style={{
                    padding: "18px 20px",
                    borderRight: "1px solid #151c22",
                  }}
                >
                  <div
                    style={{
                      color: "#4f5b66",
                      fontSize: 9,
                      fontWeight: 700,
                    }}
                  >
                    {number}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      color: "#cbd3da",
                      fontFamily: "Space Grotesk, sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {title}
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      color: "#626e78",
                      fontSize: 9,
                    }}
                  >
                    {description}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Identities;