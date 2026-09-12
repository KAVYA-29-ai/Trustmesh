import { useState } from "react";
import { Link } from "react-router-dom";

import StatusBadge from "../components/ui/StatusBadge";
import { bankAccount, bankTransfer, type BankActionResult } from "../services/demo";

const employee = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const admin = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

function requestFor(did: string, resource_id: string, action: string) {
  return { org_id: "acme-organization", did, role: did === employee ? "Employee" : "Admin", resource_id, action };
}

function BankDemo() {
  const [did, setDid] = useState(employee);
  const [loggedIn, setLoggedIn] = useState(false);
  const [account, setAccount] = useState<BankActionResult | null>(null);
  const [transfer, setTransfer] = useState<BankActionResult | null>(null);
  const [recipient, setRecipient] = useState("Demo Beneficiary");
  const [amount, setAmount] = useState("25");
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  async function viewAccount() {
    setLoading("account"); setError("");
    try { setAccount(await bankAccount(requestFor(did, "acme-bank-account", "READ"))); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Account request failed."); }
    finally { setLoading(""); }
  }

  async function submitTransfer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading("transfer"); setError("");
    try { setTransfer(await bankTransfer({ ...requestFor(did, "acme-bank-transfer", "TRANSFER"), amount: Number(amount), recipient })); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Transfer request failed."); }
    finally { setLoading(""); }
  }

  return <div className="bank-shell">
    <header className="external-header bank-header"><div className="bank-brand"><span className="bank-mark">A</span><div><strong>Acme Bank</strong><span>Fictional retail banking demo</span></div></div><div className="bank-header-links"><Link to="/attack">Attack Demo</Link><Link to="/security">TrustMesh Control Plane</Link></div></header>
    <main className="bank-content">
      <section className="bank-hero"><div><span className="side-eyebrow bank-eyebrow">BANK / TARGET APPLICATION</span><h1>Your money, protected by policy.</h1><p>A realistic demo target for normal customer activity. Every account and transfer action crosses the TrustMesh security checkpoint.</p></div><div className="protection-lock"><span>●</span><strong>TrustMesh protected</strong><small>Backend checkpoint active</small></div></section>
      <section className="bank-session panel"><div><span className="panel-kicker">CUSTOMER SESSION</span><h2>{loggedIn ? "Session active" : "Sign in to Acme Bank"}</h2><p>{loggedIn ? "Choose an identity to exercise legitimate banking behavior." : "This fictional application uses a controlled demo identity. No wallet required."}</p></div><div className="bank-session-controls"><select aria-label="Demo identity" value={did} onChange={(event) => { setDid(event.target.value); setAccount(null); setTransfer(null); }}><option value={employee}>Jordan Lee · Employee</option><option value={admin}>Alex Morgan · Admin</option></select><button className="bank-primary" type="button" onClick={() => setLoggedIn(true)}>{loggedIn ? "Signed in" : "Sign in"}</button></div></section>
      <section className="bank-grid">
        <article className="bank-card bank-account-card"><div className="bank-card-top"><span className="bank-icon">$</span><StatusBadge variant={account?.allowed ? "success" : "neutral"}>{account ? account.decision : "READY"}</StatusBadge></div><span className="panel-kicker">PROTECTED ACCOUNT VIEW</span><h2>Primary checking</h2><p>Account details and balance are protected resources.</p>{account?.allowed && account.account ? <div className="balance"><small>AVAILABLE BALANCE</small><strong>${account.account.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong><span>{account.account.currency} · ACME-001</span></div> : <div className="bank-placeholder">Sign in, then request the account view through TrustMesh.</div>}<button className="bank-primary" type="button" disabled={!loggedIn || loading === "account"} onClick={() => void viewAccount()}>{loading === "account" ? "Checking policy..." : "View account and balance"}</button>{account && <Decision result={account} />}</article>
        <article className="bank-card"><div className="bank-card-top"><span className="bank-icon">↗</span><StatusBadge variant={transfer?.allowed ? "success" : "neutral"}>{transfer ? transfer.decision : "READY"}</StatusBadge></div><span className="panel-kicker">PROTECTED TRANSFER</span><h2>Send money</h2><p>Normal customer behavior, evaluated as a protected transfer.</p><form className="bank-form" onSubmit={submitTransfer}><label>Recipient<input value={recipient} onChange={(event) => setRecipient(event.target.value)} required /></label><label>Amount<input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="1" step="0.01" required /></label><button className="bank-primary" type="submit" disabled={!loggedIn || loading === "transfer"}>{loading === "transfer" ? "Checking policy..." : "Send demo transfer"}</button></form>{transfer && <Decision result={transfer} />}</article>
        <article className="bank-card bank-activity-card"><div className="bank-card-top"><span className="bank-icon">≡</span><StatusBadge>LIVE</StatusBadge></div><span className="panel-kicker">ACCOUNT ACTIVITY</span><h2>Recent activity</h2><div className="activity-row"><span>TrustMesh checkpoint</span><strong>{account ? account.decision : "Awaiting"}</strong></div><div className="activity-row"><span>Customer identity</span><strong>{did === employee ? "Employee" : "Admin"}</strong></div><div className="activity-row"><span>Target status</span><strong>Protected</strong></div><Link className="bank-text-link" to="/audit">View audit evidence →</Link></article>
      </section>
      {error && <div className="bank-error" role="alert">{error}</div>}
      <footer className="bank-footer"><span>Acme Bank is a fictional demo target.</span><span>TrustMesh makes the access decision outside this application.</span><Link to="/attack">Open controlled Attack Demo →</Link></footer>
    </main>
  </div>;
}

function Decision({ result }: { result: BankActionResult }) {
  return <div className={`bank-decision ${result.allowed ? "is-allowed" : "is-denied"}`}><strong>{result.allowed ? "ALLOW" : "DENY"}</strong><span>{result.allowed ? "TrustMesh policy permitted this action." : "TrustMesh denied this action or identity status."}</span></div>;
}

export default BankDemo;
