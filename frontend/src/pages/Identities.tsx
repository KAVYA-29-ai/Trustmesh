import { useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import StatusBadge from "../components/ui/StatusBadge";
import Icon from "../components/ui/Icon";

interface Identity {
  did: string;
  address: string;
  role: string;
  status: "Verified" | "Pending";
  lastActive: string;
}

const demoIdentities: Identity[] = [
  {
    did: "did:trust:7f3a...91c2",
    address: "0x7A21...91C2",
    role: "Administrator",
    status: "Verified",
    lastActive: "2 min ago",
  },
  {
    did: "did:trust:4b82...3e17",
    address: "0x4B82...3E17",
    role: "Security Analyst",
    status: "Verified",
    lastActive: "18 min ago",
  },
  {
    did: "did:trust:91de...72af",
    address: "0x91DE...72AF",
    role: "Developer",
    status: "Verified",
    lastActive: "1 hr ago",
  },
  {
    did: "did:trust:2c61...8ab4",
    address: "0x2C61...8AB4",
    role: "Viewer",
    status: "Pending",
    lastActive: "3 hrs ago",
  },
];

function Identities() {
  const [search, setSearch] = useState("");

  const filteredIdentities = demoIdentities.filter((identity) =>
    `${identity.did} ${identity.address} ${identity.role}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-area">
        <Topbar />

        <main className="dashboard">
          <section className="page-heading">
            <div>
              <div className="eyebrow">IDENTITY MANAGEMENT</div>
              <h1>Identities</h1>
              <p>
                Manage decentralized identities, wallet bindings, roles,
                and verification status.
              </p>
            </div>

            <StatusBadge>Identity layer ready</StatusBadge>
          </section>

          <section className="stats-grid identity-stats">
            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">TOTAL IDENTITIES</span>
                <span className="stat-icon"><Icon name="identity" /></span>
              </div>
              <div className="stat-value">{demoIdentities.length}</div>
              <div className="stat-detail">Registered in this organization</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">VERIFIED</span>
                <span className="stat-icon"><Icon name="check" /></span>
              </div>
              <div className="stat-value">
                {demoIdentities.filter(
                  (identity) => identity.status === "Verified",
                ).length}
              </div>
              <div className="stat-detail">Successfully verified identities</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">PENDING</span>
                <span className="stat-icon"><Icon name="resource" /></span>
              </div>
              <div className="stat-value">
                {demoIdentities.filter(
                  (identity) => identity.status === "Pending",
                ).length}
              </div>
              <div className="stat-detail">Awaiting verification</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">IDENTITY METHOD</span>
                <span className="stat-icon"><Icon name="identity" /></span>
              </div>
              <div className="stat-value">DID</div>
              <div className="stat-detail">Decentralized identity registry</div>
            </div>
          </section>

          <section className="panel identity-panel">
            <div className="panel-header">
              <div>
                <div className="panel-kicker">DIRECTORY</div>
                <h2>Organization identities</h2>
              </div>

              <button type="button" className="primary-action">
                <Icon name="identity" />
                <span>Register identity</span>
              </button>
            </div>

            <div className="identity-toolbar">
              <div className="identity-search">
                <span className="identity-search-icon"><Icon name="search" /></span>
                <input
                  type="text"
                  placeholder="Search DID, wallet, or role..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <button className="filter-button">
                <span>All identities</span>
                <span aria-hidden="true">⌄</span>
              </button>
            </div>

            <div className="identity-table">
              <div className="identity-table-header">
                <span>IDENTITY</span>
                <span>WALLET</span>
                <span>ROLE</span>
                <span>STATUS</span>
                <span>LAST ACTIVE</span>
              </div>

              {filteredIdentities.length === 0 ? (
                <div className="identity-empty">
                  <div className="security-state-icon"><Icon name="identity" /></div>
                  <h3>No identities found</h3>
                  <p>Try a different DID, wallet address, or role.</p>
                </div>
              ) : (
                filteredIdentities.map((identity) => (
                  <div className="identity-row" key={identity.did}>
                    <div className="identity-primary">
                      <span className="identity-avatar">D</span>
                      <div>
                        <strong>{identity.did}</strong>
                        <span>Decentralized identity</span>
                      </div>
                    </div>

                    <span className="identity-mono">
                      {identity.address}
                    </span>

                    <span className="identity-role">
                      {identity.role}
                    </span>

                    <div>
                      <StatusBadge
                        variant={
                          identity.status === "Verified"
                            ? "success"
                            : "warning"
                        }
                      >
                        {identity.status}
                      </StatusBadge>
                    </div>

                    <span className="identity-time">
                      {identity.lastActive}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Identities;