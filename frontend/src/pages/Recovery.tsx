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

  const [requests, setRequests] = useState<RecoveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRecovery() {
      try {
        setLoading(true);
        setError("");

        const response = await getRecoveryCenter();

        setSummary({
          active_requests: response.summary.active_requests,
          pending_consensus: response.summary.pending_consensus,
          required_approvals: response.summary.required_approvals,
          timelock_hours: response.summary.timelock_hours,
        });

        setRequests(
          Array.isArray(response.requests)
            ? response.requests
            : [],
        );
      } catch (error) {
        console.error("Failed to load recovery center:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load the recovery center.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadRecovery();
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-area">
        <Topbar />

        <main className="dashboard">
          <section className="page-heading">
            <div>
              <div className="eyebrow">SENTINEL PROTOCOL</div>

              <h1>Identity Recovery</h1>

              <p>
                Coordinate identity recovery through guardian
                consensus and a protected timelock.
              </p>
            </div>

            <StatusBadge>Sentinel layer ready</StatusBadge>
          </section>

          <section className="security-overview">
            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">
                  ACTIVE REQUESTS
                </span>

                <span className="stat-icon"><Icon name="resource" /></span>
              </div>

              <div className="stat-value">
                {loading ? "…" : summary.active_requests}
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

                <span className="stat-icon"><Icon name="identity" /></span>
              </div>

              <div className="stat-value">
                {loading ? "…" : summary.pending_consensus}
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

                <span className="stat-icon"><Icon name="check" /></span>
              </div>

              <div className="stat-value">
                {loading ? "…" : summary.required_approvals}
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

                <span className="stat-icon"><Icon name="resource" /></span>
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
              </div>

              <StatusBadge>
                {loading
                  ? "Loading"
                  : "Consensus protected"}
              </StatusBadge>
            </div>

            {loading ? (
              <div className="resource-empty recovery-state">
                <div className="security-state-icon">
                  <Icon name="identity" />
                </div>

                <h3>Loading recovery requests</h3>

                <p>
                  Reading Sentinel recovery state.
                </p>
              </div>
            ) : error ? (
              <div className="resource-empty recovery-state recovery-error">
                <div className="security-state-icon">
                  <Icon name="shield" />
                </div>

                <h3>Recovery service unavailable</h3>

                <p>{error}</p>

                <button
                  type="button"
                  className="recovery-retry"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </button>
              </div>
            ) : requests.length === 0 ? (
              <div className="resource-empty recovery-state">
                <div className="security-state-icon">
                  <Icon name="check" />
                </div>

                <h3>No active recovery requests</h3>

                <p>
                  All registered identities are currently healthy.
                </p>
              </div>
            ) : (
              <div className="recovery-list">
                {requests.map((request) => {
                  const progress =
                    request.required_approvals > 0
                      ? Math.min(
                          (request.approvals /
                            request.required_approvals) *
                            100,
                          100,
                        )
                      : 0;

                  return (
                    <div
                      className="recovery-request"
                      key={request.request_id}
                    >
                      <div className="recovery-request-icon">
                        <Icon name="identity" />
                      </div>

                      <div className="recovery-request-main">
                        <div className="recovery-request-title">
                          <strong>{request.reason}</strong>

                          <span>
                            {request.request_id}
                          </span>
                        </div>

                        <div className="recovery-request-subject">
                          Subject:{" "}
                          <strong>{request.subject}</strong>
                        </div>

                        <div className="recovery-progress">
                          <div className="recovery-progress-header">
                            <span>
                              Guardian consensus
                            </span>

                            <strong>
                              {request.approvals}/
                              {request.required_approvals}
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
                          Timelock:{" "}
                          {request.timelock_hours}h
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default Recovery;