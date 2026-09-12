import { useEffect, useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import StatusBadge from "../components/ui/StatusBadge";
import Icon from "../components/ui/Icon";
import { getDpdpReport } from "../services/security";
import type { DpdpReportResponse } from "../types/api";

function Compliance() {
  const [report, setReport] = useState<DpdpReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReport() {
    try {
      setLoading(true);
      setError("");
      setReport(await getDpdpReport());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load the evidence report.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReport();
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <main className="dashboard">
          <section className="page-heading">
            <div>
              <div className="eyebrow">EVIDENCE REPORTING</div>
              <h1>DPDP evidence report</h1>
              <p>Observed TrustMesh security evidence with compliance interpretation kept separate from verified facts.</p>
            </div>
            <StatusBadge>{loading ? "Loading" : report?.status ?? "Unavailable"}</StatusBadge>
          </section>

          {error && <div className="security-load-error" role="alert"><Icon name="shield" /><span>{error}</span><button type="button" onClick={() => void loadReport()}>Retry</button></div>}

          {loading ? <div className="resource-empty"><h3>Reading indexed evidence</h3><p>Loading audit events, findings, incidents, and controls.</p></div> : report && <>
            <section className="stats-grid">
              {Object.entries(report.observed_evidence).map(([label, value]) => <div className="stat-card" key={label}><div className="stat-card-top"><span className="stat-label">{label.replaceAll("_", " ")}</span><span className="stat-icon"><Icon name="database" /></span></div><div className="stat-value">{value}</div><div className="stat-detail">Observed indexed evidence</div></div>)}
            </section>
            <section className="panel">
              <div className="panel-header"><div><div className="panel-kicker">EXECUTIVE SUMMARY</div><h2>What the evidence supports</h2></div><StatusBadge>{report.risk_posture.risk_level}</StatusBadge></div>
              <p className="panel-description">{report.executive_summary}</p>
              <div className="incident-evidence-summary"><span>Risk score <b>{report.risk_posture.score}/100</b></span><span>Findings <b>{report.risk_posture.findings}</b></span><span>Recent events <b>{report.risk_posture.recent_events}</b></span></div>
            </section>
            <section className="security-main-grid">
              <article className="panel"><div className="panel-header"><div><div className="panel-kicker">SECURITY CONTROLS</div><h2>Controls observed</h2></div></div><div className="activity-command-list">{Object.entries(report.risk_posture.controls).map(([control, observed]) => <div className="command-event" key={control}><span className={`command-event-dot ${observed ? "low" : "medium"}`} /><div><strong>{control.replaceAll("_", " ")}</strong><span>{observed ? "Evidence observed" : "No evidence in current report"}</span></div></div>)}</div></article>
              <article className="panel"><div className="panel-header"><div><div className="panel-kicker">RISK CONTRIBUTORS</div><h2>Observed factors</h2></div></div><div className="activity-command-list">{report.risk_posture.factors.map((factor) => <div className="command-event" key={factor}><span className="command-event-dot high" /><div><strong>{factor}</strong><span>Derived from indexed security evidence</span></div></div>)}</div></article>
            </section>
            <section className="panel"><div className="panel-header"><div><div className="panel-kicker">EVIDENCE GAPS</div><h2>What is not established</h2></div></div>{report.evidence_gaps.length ? <ul>{report.evidence_gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul> : <p className="panel-description">No evidence gaps were reported by the current deterministic report.</p>}</section>
          </>}
        </main>
      </div>
    </div>
  );
}

export default Compliance;
