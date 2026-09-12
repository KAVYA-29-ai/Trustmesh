import { useMemo, useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import StatusBadge from "../components/ui/StatusBadge";
import Icon from "../components/ui/Icon";

interface Policy {
  id: string;
  name: string;
  description: string;
  subject: string;
  resource: string;
  action: string;
  effect: "Allow" | "Deny";
  status: "Active" | "Draft";
  updated: string;
}

const initialPolicies: Policy[] = [
  {
    id: "POL-001",
    name: "Administrator full access",
    description: "Administrators can manage all protected resources.",
    subject: "Administrator",
    resource: "All resources",
    action: "All actions",
    effect: "Allow",
    status: "Active",
    updated: "12 min ago",
  },
  {
    id: "POL-002",
    name: "Analyst security access",
    description: "Security analysts can inspect security and audit resources.",
    subject: "Security Analyst",
    resource: "Security Center",
    action: "Read",
    effect: "Allow",
    status: "Active",
    updated: "1 hr ago",
  },
  {
    id: "POL-003",
    name: "Developer application access",
    description: "Developers can access assigned application resources.",
    subject: "Developer",
    resource: "Applications",
    action: "Read, Write",
    effect: "Allow",
    status: "Active",
    updated: "3 hrs ago",
  },
  {
    id: "POL-004",
    name: "Viewer restricted access",
    description: "Viewers can inspect approved resources only.",
    subject: "Viewer",
    resource: "Assigned resources",
    action: "Read",
    effect: "Allow",
    status: "Draft",
    updated: "Yesterday",
  },
];

function Policies() {
  const [policies, setPolicies] = useState<Policy[]>(initialPolicies);
  const [search, setSearch] = useState("");
  const [showBuilder, setShowBuilder] = useState(false);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("Administrator");
  const [resource, setResource] = useState("All resources");
  const [action, setAction] = useState("Read");
  const [effect, setEffect] = useState<"Allow" | "Deny">("Allow");

  const filteredPolicies = useMemo(() => {
    const query = search.toLowerCase();

    return policies.filter((policy) =>
      `${policy.name} ${policy.description} ${policy.subject} ${policy.resource}`
        .toLowerCase()
        .includes(query),
    );
  }, [policies, search]);

  const activeCount = policies.filter(
    (policy) => policy.status === "Active",
  ).length;

  function createPolicy() {
    if (!name.trim()) {
      return;
    }

    const newPolicy: Policy = {
      id: `POL-${String(policies.length + 1).padStart(3, "0")}`,
      name: name.trim(),
      description: `${subject} ${effect.toLowerCase()} access to ${resource}.`,
      subject,
      resource,
      action,
      effect,
      status: "Draft",
      updated: "Just now",
    };

    setPolicies((current) => [newPolicy, ...current]);
    setName("");
    setShowBuilder(false);
  }

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-area">
        <Topbar />

        <main className="dashboard">
          <section className="page-heading">
            <div>
              <div className="eyebrow">POLICY CONTROL</div>
              <h1>Policies</h1>
              <p>
                Define exactly who can access which resources and actions.
              </p>
            </div>

            <StatusBadge>Policy engine ready</StatusBadge>
          </section>

          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">TOTAL POLICIES</span>
                <span className="stat-icon"><Icon name="policy" /></span>
              </div>
              <div className="stat-value">{policies.length}</div>
              <div className="stat-detail">Organization policy definitions</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">ACTIVE</span>
                <span className="stat-icon"><Icon name="check" /></span>
              </div>
              <div className="stat-value">{activeCount}</div>
              <div className="stat-detail">Policies currently enforced</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">DRAFTS</span>
                <span className="stat-icon"><Icon name="draft" /></span>
              </div>
              <div className="stat-value">
                {policies.length - activeCount}
              </div>
              <div className="stat-detail">Policies awaiting activation</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">DECISION MODEL</span>
                <span className="stat-icon"><Icon name="shield" /></span>
              </div>
              <div className="stat-value">RBAC</div>
              <div className="stat-detail">Role-based access control</div>
            </div>
          </section>

          <section className="policy-builder-layout">
            <div className="panel policy-list-panel">
              <div className="panel-header">
                <div>
                  <div className="panel-kicker">POLICY DIRECTORY</div>
                  <h2>Access policies</h2>
                </div>

                <button
                  className="primary-action"
                  onClick={() => setShowBuilder(true)}
                >
                  + Create policy
                </button>
              </div>

              <div className="identity-toolbar">
                <div className="identity-search">
                  <span className="search-icon"><Icon name="search" /></span>
                  <input
                    type="text"
                    placeholder="Search policies..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                <button className="filter-button">
                  All policies
                  <span className="filter-chevron">⌄</span>
                </button>
              </div>

              <div className="policy-list">
                {filteredPolicies.length === 0 ? (
                  <div className="identity-empty">
                    <div className="empty-icon"><Icon name="search" /></div>
                    <h3>No policies found</h3>
                    <p>Try a different policy name or resource.</p>
                  </div>
                ) : (
                  filteredPolicies.map((policy) => (
                    <div className="policy-row" key={policy.id}>
                      <div className="policy-main">
                        <div className="policy-icon"><Icon name="policy" /></div>

                        <div>
                          <strong>{policy.name}</strong>
                          <span>{policy.description}</span>
                        </div>
                      </div>

                      <div className="policy-rule">
                        <span className="policy-rule-label">SUBJECT</span>
                        <strong>{policy.subject}</strong>
                      </div>

                      <div className="policy-rule">
                        <span className="policy-rule-label">RESOURCE</span>
                        <strong>{policy.resource}</strong>
                      </div>

                      <div className="policy-rule">
                        <span className="policy-rule-label">ACTION</span>
                        <strong>{policy.action}</strong>
                      </div>

                      <div className="policy-result">
                        <StatusBadge
                          variant={
                            policy.effect === "Allow"
                              ? "success"
                              : "danger"
                          }
                        >
                          {policy.effect}
                        </StatusBadge>

                        <span>{policy.updated}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="panel policy-model-panel">
              <div className="panel-header">
                <div>
                  <div className="panel-kicker">ACCESS MODEL</div>
                  <h2>Authorization flow</h2>
                </div>
              </div>

              <div className="policy-flow">
                <div className="policy-flow-node">
                  <span>01</span>
                  <strong>Identity</strong>
                  <small>DID / wallet</small>
                </div>

                <div className="policy-flow-arrow"><Icon name="arrow" /></div>

                <div className="policy-flow-node">
                  <span>02</span>
                  <strong>Role</strong>
                  <small>RBAC assignment</small>
                </div>

                <div className="policy-flow-arrow"><Icon name="arrow" /></div>

                <div className="policy-flow-node">
                  <span>03</span>
                  <strong>Policy</strong>
                  <small>Rules evaluated</small>
                </div>

                <div className="policy-flow-arrow"><Icon name="arrow" /></div>

                <div className="policy-flow-node">
                  <span>04</span>
                  <strong>Decision</strong>
                  <small>Allow / deny</small>
                </div>
              </div>

              <div className="policy-callout">
                <span>CORE ACCESS CALL</span>
                <code>
                  PolicyEngine.checkAccess(orgId, did, resourceId, action)
                </code>
              </div>
            </div>
          </section>
        </main>
      </div>

      {showBuilder && (
        <div className="policy-modal-backdrop">
          <section className="policy-modal">
            <div className="policy-modal-header">
              <div>
                <div className="panel-kicker">POLICY BUILDER</div>
                <h2>Create access policy</h2>
                <p>
                  Define the authorization rule using the TrustLayer access
                  model.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() => setShowBuilder(false)}
              >
                ×
              </button>
            </div>

            <div className="policy-form">
              <label>
                Policy name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Finance read access"
                />
              </label>

              <label>
                Subject / role
                <select
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                >
                  <option>Administrator</option>
                  <option>Security Analyst</option>
                  <option>Developer</option>
                  <option>Viewer</option>
                </select>
              </label>

              <label>
                Resource
                <select
                  value={resource}
                  onChange={(event) => setResource(event.target.value)}
                >
                  <option>All resources</option>
                  <option>Applications</option>
                  <option>Security Center</option>
                  <option>Audit Log</option>
                  <option>Digital Assets</option>
                  <option>Assigned resources</option>
                </select>
              </label>

              <label>
                Action
                <select
                  value={action}
                  onChange={(event) => setAction(event.target.value)}
                >
                  <option>Read</option>
                  <option>Write</option>
                  <option>Execute</option>
                  <option>Manage</option>
                  <option>All actions</option>
                </select>
              </label>

              <label>
                Effect
                <select
                  value={effect}
                  onChange={(event) =>
                    setEffect(event.target.value as "Allow" | "Deny")
                  }
                >
                  <option>Allow</option>
                  <option>Deny</option>
                </select>
              </label>
            </div>

            <div className="policy-preview">
              <span>POLICY PREVIEW</span>

              <strong>
                {subject} → {action} → {resource}
              </strong>

              <small>
                Decision: <b>{effect}</b>
              </small>
            </div>

            <div className="policy-modal-actions">
              <button
                className="filter-button"
                onClick={() => setShowBuilder(false)}
              >
                Cancel
              </button>

              <button
                className="primary-action"
                onClick={createPolicy}
                disabled={!name.trim()}
              >
                Create draft
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default Policies;