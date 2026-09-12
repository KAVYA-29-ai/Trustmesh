import { useMemo, useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import StatusBadge from "../components/ui/StatusBadge";
import Icon from "../components/ui/Icon";

type PolicyEffect = "Allow" | "Deny" | "Adaptive";
type PolicyStatus = "Active" | "Draft";

interface Policy {
  id: string;
  name: string;
  description: string;
  subject: string;
  resource: string;
  action: string;
  effect: PolicyEffect;
  status: PolicyStatus;
  updated: string;
}

const initialPolicies: Policy[] = [
  {
    id: "POL-001",
    name: "Administrator full access",
    description: "Administrators can manage protected resources.",
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
    description: "Security analysts can inspect security resources.",
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
    description: "Developers can access assigned applications.",
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
    effect: "Adaptive",
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
  const [effect, setEffect] = useState<PolicyEffect>("Allow");

  const filteredPolicies = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return policies;
    }

    return policies.filter((policy) =>
      [
        policy.name,
        policy.description,
        policy.subject,
        policy.resource,
        policy.action,
        policy.effect,
        policy.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [policies, search]);

  const activeCount = policies.filter(
    (policy) => policy.status === "Active",
  ).length;

  const adaptiveCount = policies.filter(
    (policy) => policy.effect === "Adaptive",
  ).length;

  function openBuilder() {
    setName("");
    setSubject("Administrator");
    setResource("All resources");
    setAction("Read");
    setEffect("Allow");
    setShowBuilder(true);
  }

  function closeBuilder() {
    setShowBuilder(false);
  }

  function createPolicy() {
    if (!name.trim()) {
      return;
    }

    const newPolicy: Policy = {
      id: `POL-${String(policies.length + 1).padStart(3, "0")}`,
      name: name.trim(),
      description:
        effect === "Adaptive"
          ? `${subject} receives adaptive access to ${resource}.`
          : `${subject} receives ${effect.toLowerCase()} access to ${resource}.`,
      subject,
      resource,
      action,
      effect,
      status: "Draft",
      updated: "Just now",
    };

    setPolicies((current) => [newPolicy, ...current]);
    closeBuilder();
  }

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-area">
        <Topbar />

        <main className="dashboard tm-policy-page">
          <section className="tm-policy-heading">
            <div>
              <div className="tm-policy-eyebrow">ACCESS CONTROL</div>

              <h1>Policies</h1>

              <p>
                Define which identities can perform protected actions across
                the TrustMesh environment.
              </p>
            </div>

            <div className="tm-policy-heading-actions">
              <div className="tm-policy-engine">
                <span />
                Policy engine active
              </div>

              <button
                type="button"
                className="tm-policy-create"
                onClick={openBuilder}
              >
                <span>+</span>
                Create policy
              </button>
            </div>
          </section>

          <section className="tm-policy-metrics">
            <article className="tm-policy-metric">
              <div className="tm-policy-metric-label">TOTAL POLICIES</div>
              <div className="tm-policy-metric-value">{policies.length}</div>
              <div className="tm-policy-metric-detail">
                Organization authorization rules
              </div>
            </article>

            <article className="tm-policy-metric">
              <div className="tm-policy-metric-label">ACTIVE</div>
              <div className="tm-policy-metric-value tm-green">
                {activeCount}
              </div>
              <div className="tm-policy-metric-detail">
                Currently enforced
              </div>
            </article>

            <article className="tm-policy-metric">
              <div className="tm-policy-metric-label">DRAFTS</div>
              <div className="tm-policy-metric-value tm-amber">
                {policies.length - activeCount}
              </div>
              <div className="tm-policy-metric-detail">
                Awaiting activation
              </div>
            </article>

            <article className="tm-policy-metric">
              <div className="tm-policy-metric-label">ADAPTIVE</div>
              <div className="tm-policy-metric-value tm-blue">
                {adaptiveCount}
              </div>
              <div className="tm-policy-metric-detail">
                Risk-aware access rules
              </div>
            </article>
          </section>

          <section className="tm-policy-layout">
            <article className="tm-policy-directory">
              <div className="tm-policy-section-head">
                <div>
                  <div className="tm-policy-kicker">POLICY DIRECTORY</div>
                  <h2>Authorization rules</h2>
                  <p>
                    Every protected request is evaluated against these rules.
                  </p>
                </div>

                <div className="tm-policy-count">
                  {filteredPolicies.length} rules
                </div>
              </div>

              <div className="tm-policy-toolbar">
                <div className="tm-policy-search">
                  <Icon name="search" />

                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by policy, role, resource or action..."
                    aria-label="Search policies"
                  />
                </div>

                {search && (
                  <button
                    type="button"
                    className="tm-policy-clear"
                    onClick={() => setSearch("")}
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="tm-policy-table">
                <div className="tm-policy-table-head">
                  <span>POLICY</span>
                  <span>SUBJECT</span>
                  <span>RESOURCE</span>
                  <span>ACTION</span>
                  <span>DECISION</span>
                  <span>STATE</span>
                </div>

                {filteredPolicies.length === 0 ? (
                  <div className="tm-policy-empty">
                    <div className="tm-policy-empty-icon">
                      <Icon name="search" />
                    </div>
                    <strong>No policies found</strong>
                    <span>
                      Try a different policy, role, resource or action.
                    </span>
                  </div>
                ) : (
                  filteredPolicies.map((policy) => (
                    <div className="tm-policy-row" key={policy.id}>
                      <div className="tm-policy-name">
                        <div className="tm-policy-icon">
                          <Icon name="policy" />
                        </div>

                        <div>
                          <strong>{policy.name}</strong>
                          <span>{policy.description}</span>
                          <small>{policy.id}</small>
                        </div>
                      </div>

                      <div className="tm-policy-cell">
                        {policy.subject}
                      </div>

                      <div className="tm-policy-cell">
                        {policy.resource}
                      </div>

                      <div className="tm-policy-cell">
                        {policy.action}
                      </div>

                      <div>
                        <span
                          className={`tm-policy-effect tm-effect-${policy.effect.toLowerCase()}`}
                        >
                          <span />
                          {policy.effect}
                        </span>
                      </div>

                      <div className="tm-policy-state">
                        <StatusBadge
                          variant={
                            policy.status === "Active"
                              ? "success"
                              : "warning"
                          }
                        >
                          {policy.status}
                        </StatusBadge>

                        <small>{policy.updated}</small>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>

            <aside className="tm-policy-model">
              <div className="tm-policy-section-head">
                <div>
                  <div className="tm-policy-kicker">DECISION PIPELINE</div>
                  <h2>How access is evaluated</h2>
                </div>
              </div>

              <div className="tm-policy-pipeline">
                <div className="tm-policy-pipeline-node">
                  <span>01</span>
                  <strong>Identity</strong>
                  <small>Identity state</small>
                </div>

                <div className="tm-policy-pipeline-line" />

                <div className="tm-policy-pipeline-node">
                  <span>02</span>
                  <strong>Role</strong>
                  <small>RBAC assignment</small>
                </div>

                <div className="tm-policy-pipeline-line" />

                <div className="tm-policy-pipeline-node">
                  <span>03</span>
                  <strong>Policy</strong>
                  <small>Rule evaluation</small>
                </div>

                <div className="tm-policy-pipeline-line" />

                <div className="tm-policy-pipeline-node tm-policy-pipeline-final">
                  <span>04</span>
                  <strong>Checkpoint</strong>
                  <small>Allow / deny / adapt</small>
                </div>
              </div>

              <div className="tm-policy-decision-card">
                <div className="tm-policy-decision-top">
                  <span>PROTECTED REQUEST</span>
                  <span className="tm-live-dot">
                    <i />
                    LIVE
                  </span>
                </div>

                <div className="tm-policy-decision-route">
                  <span>Identity</span>
                  <b>→</b>
                  <span>Role</span>
                  <b>→</b>
                  <span>Policy</span>
                  <b>→</b>
                  <strong>Decision</strong>
                </div>

                <p>
                  Identity state and authorization policy are checked before a
                  protected action is allowed to continue.
                </p>
              </div>

              <div className="tm-policy-effects">
                <div className="tm-policy-effects-title">
                  DECISION TYPES
                </div>

                <div className="tm-policy-effect-row">
                  <span className="tm-effect-dot tm-dot-allow" />
                  <div>
                    <strong>Allow</strong>
                    <small>Request proceeds normally.</small>
                  </div>
                </div>

                <div className="tm-policy-effect-row">
                  <span className="tm-effect-dot tm-dot-adaptive" />
                  <div>
                    <strong>Adaptive</strong>
                    <small>Access changes according to risk.</small>
                  </div>
                </div>

                <div className="tm-policy-effect-row">
                  <span className="tm-effect-dot tm-dot-deny" />
                  <div>
                    <strong>Deny</strong>
                    <small>Protected action is rejected.</small>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        </main>
      </div>

      {showBuilder && (
        <div
          className="tm-policy-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeBuilder();
            }
          }}
        >
          <section
            className="tm-policy-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="policy-builder-title"
          >
            <div className="tm-policy-modal-head">
              <div>
                <div className="tm-policy-eyebrow">POLICY BUILDER</div>

                <h2 id="policy-builder-title">Create access policy</h2>

                <p>
                  Define the identity, protected resource, action and decision
                  behavior.
                </p>
              </div>

              <button
                type="button"
                className="tm-policy-modal-close"
                onClick={closeBuilder}
                aria-label="Close policy builder"
              >
                ×
              </button>
            </div>

            <div className="tm-policy-form">
              <label className="tm-policy-field tm-policy-field-full">
                <span>Policy name</span>

                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Finance transfer protection"
                  autoFocus
                />
              </label>

              <label className="tm-policy-field">
                <span>Subject / role</span>

                <select
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                >
                  <option>Administrator</option>
                  <option>Security Analyst</option>
                  <option>Developer</option>
                  <option>Viewer</option>
                  <option>Employee</option>
                </select>
              </label>

              <label className="tm-policy-field">
                <span>Resource</span>

                <select
                  value={resource}
                  onChange={(event) => setResource(event.target.value)}
                >
                  <option>All resources</option>
                  <option>Applications</option>
                  <option>Security Center</option>
                  <option>Audit Log</option>
                  <option>Digital Assets</option>
                  <option>Bank Accounts</option>
                  <option>Assigned resources</option>
                </select>
              </label>

              <label className="tm-policy-field">
                <span>Action</span>

                <select
                  value={action}
                  onChange={(event) => setAction(event.target.value)}
                >
                  <option>Read</option>
                  <option>Write</option>
                  <option>Execute</option>
                  <option>Transfer funds</option>
                  <option>Delete user</option>
                  <option>Manage</option>
                  <option>All actions</option>
                </select>
              </label>

              <label className="tm-policy-field">
                <span>Decision behavior</span>

                <select
                  value={effect}
                  onChange={(event) =>
                    setEffect(event.target.value as PolicyEffect)
                  }
                >
                  <option value="Allow">Allow</option>
                  <option value="Adaptive">Adaptive</option>
                  <option value="Deny">Deny</option>
                </select>
              </label>
            </div>

            <div className="tm-policy-preview">
              <div className="tm-policy-preview-head">
                <span>POLICY PREVIEW</span>
                <span
                  className={`tm-policy-preview-effect tm-preview-${effect.toLowerCase()}`}
                >
                  {effect}
                </span>
              </div>

              <div className="tm-policy-preview-route">
                <div>
                  <small>SUBJECT</small>
                  <strong>{subject}</strong>
                </div>

                <span>→</span>

                <div>
                  <small>ACTION</small>
                  <strong>{action}</strong>
                </div>

                <span>→</span>

                <div>
                  <small>RESOURCE</small>
                  <strong>{resource}</strong>
                </div>
              </div>

              <p>
                This rule will be created as a <strong>Draft</strong> and can
                then be activated through the access-control workflow.
              </p>
            </div>

            <div className="tm-policy-modal-footer">
              <button
                type="button"
                className="tm-policy-secondary"
                onClick={closeBuilder}
              >
                Cancel
              </button>

              <button
                type="button"
                className="tm-policy-create"
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