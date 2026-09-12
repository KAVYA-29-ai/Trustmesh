import { useEffect, useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import StatusBadge from "../components/ui/StatusBadge";
import Icon from "../components/ui/Icon";
import { getRecoveryCenter } from "../services/recovery";
import type {
  RecoveryRequest,
  RecoverySummary,
} from "../types/api";

function Recovery() {
  const [summary, setSummary] = useState<RecoverySummary>({
    active_requests: 0,
    pending_consensus: 0,
    required_approvals: 0,
    timelock_hours: 0,
  });

  const [requests, setRequests] = useState<
    RecoveryRequest[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRecovery() {
    try {
      setLoading(true);
      setError("");

      const response = await getRecoveryCenter();

      setSummary({
        active_requests: response.summary.active_requests,
        pending_consensus:
          response.summary.pending_consensus,
        required_approvals:
          response.summary.required_approvals,
        timelock_hours:
          response.summary.timelock_hours,
      });

      setRequests(
        Array.isArray(response.requests)
          ? response.requests
          : [],
      );
    } catch (err) {
      console.error(
        "Failed to load recovery center:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load the recovery center.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRecovery();
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-area">
        <Topbar />

        <main className="dashboard">
          <section className="page-heading">
            <div>
              <div className="eyebrow">
                SENTINEL PROTOCOL
              </div>

              <h1>Identity Recovery</h1>

              <p>
                Coordinate identity recovery through guardian
                consensus and a protected timelock.
              </p>
            </div>

            <StatusBadge>
              Sentinel layer ready
            </StatusBadge>
          </section>

          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">
                  ACTIVE REQUESTS
                </span>

                <span className="stat-icon">
                  <Icon name="resource" />
                </span>
              </div>

              <div className="stat-value">
                {loading
                  ? "…"
                  : summary.active_requests}
              </div>

              <div className="stat-detail">
                Recovery requests in progress
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">
                  CONSENSUS
                </span>

                <span className="stat-icon">
                  <Icon name="identity" />
                </span>
              </div>

              <div className="stat-value">
                {loading
                  ? "…"
                  : summary.pending_consensus}
              </div>

              <div className="stat-detail">
                Requests awaiting approval
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">
                  APPROVALS REQUIRED
                </span>

                <span className="stat-icon">
                  <Icon name="check" />
                </span>
              </div>

              <div className="stat-value">
                {loading
                  ? "…"
                  : summary.required_approvals}
              </div>

              <div className="stat-detail">
                Guardian approvals required
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">
                  TIMELOCK
                </span>

                <span className="stat-icon">
                  <Icon name="resource" />
                </span>
              </div>

              <div className="stat-value">
                {loading
                  ? "…"
                  : `${summary.timelock_hours}h`}
              </div>

              <div className="stat-detail">
                Protected recovery delay
              </div>
            </div>
          </section>

          <section className="panel recovery-panel">
            <div className="panel-header">
              <div>
                <div className="panel-kicker">
                  RECOVERY QUEUE
                </div>

                <h2>Identity recovery requests</h2>

                <p>
                  Recovery remains protected until consensus and
                  timelock requirements are satisfied.
                </p>
              </div>

              <StatusBadge>
                {loading
                  ? "Loading"
                  : "Consensus protected"}
              </StatusBadge>
            </div>

            {loading ? (
              <div
                className="resource-empty recovery-state"
                aria-live="polite"
              >
                <div className="security-state-icon">
                  <Icon name="identity" />
                </div>

                <h3>
                  Loading recovery requests
                </h3>

                <p>
                  Reading Sentinel recovery state.
                </p>
              </div>
            ) : error ? (
              <div
                className="resource-empty recovery-state recovery-error"
                role="alert"
              >
                <div className="security-state-icon">
                  <Icon name="shield" />
                </div>

                <h3>
                  Recovery service unavailable
                </h3>

                <p>{error}</p>

                <button
                  type="button"
                  className="primary-action"
                  onClick={() => void loadRecovery()}
                >
                  Retry
                </button>
              </div>
            ) : requests.length === 0 ? (
              <div className="resource-empty recovery-state">
                <div className="security-state-icon">
                  <Icon name="check" />
                </div>

                <h3>
                  No active recovery requests
                </h3>

                <p>
                  All registered identities are currently healthy.
                </p>
              </div>
            ) : (
              <div className="recovery-list">
                {requests.map((request) => {
                  const required =
                    Number(request.required_approvals) || 0;

                  const approvals =
                    Number(request.approvals) || 0;

                  const progress =
                    required > 0
                      ? Math.min(
                          (approvals / required) * 100,
                          100,
                        )
                      : 0;

                  return (
                    <article
                      className="recovery-request"
                      key={request.request_id}
                    >
                      <div className="recovery-request-icon">
                        <Icon name="identity" />
                      </div>

                      <div className="recovery-request-main">
                        <div className="recovery-request-title">
                          <strong>
                            {request.reason}
                          </strong>

                          <span>
                            {request.request_id}
                          </span>
                        </div>

                        <div className="recovery-request-subject">
                          <span>SUBJECT</span>

                          <strong>
                            {request.subject}
                          </strong>
                        </div>

                        <div className="recovery-progress">
                          <div className="recovery-progress-header">
                            <span>
                              Guardian consensus
                            </span>

                            <strong>
                              {approvals}/{required}
                            </strong>
                          </div>

                          <div className="recovery-progress-track">
                            <div
                              className="recovery-progress-fill"
                              style={{
                                width: `${progress}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="recovery-request-meta">
                        <span className="recovery-status">
                          {request.status}
                        </span>

                        <span>
                          Timelock{" "}
                          <strong>
                            {request.timelock_hours}h
                          </strong>
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="recovery-model-grid">
            <article className="panel recovery-model-card">
              <div className="recovery-model-icon">
                <Icon name="identity" />
              </div>

              <div>
                <div className="panel-kicker">
                  CONSENSUS
                </div>

                <h3>Guardian approval</h3>

                <p>
                  Recovery requires the configured guardian
                  consensus before the identity can be restored.
                </p>
              </div>
            </article>

            <article className="panel recovery-model-card">
              <div className="recovery-model-icon">
                <Icon name="resource" />
              </div>

              <div>
                <div className="panel-kicker">
                  TIMELOCK
                </div>

                <h3>Protected recovery delay</h3>

                <p>
                  A timelock provides an additional security
                  boundary before recovery becomes effective.
                </p>
              </div>
            </article>

            <article className="panel recovery-model-card">
              <div className="recovery-model-icon">
                <Icon name="shield" />
              </div>

              <div>
                <div className="panel-kicker">
                  ENFORCEMENT
                </div>

                <h3>Restore only after approval</h3>

                <p>
                  Suspended or restricted identities remain
                  protected until the recovery workflow completes.
                </p>
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Recovery;