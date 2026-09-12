import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  return (
    <main className="login-page">
      <div className="login-grid">
        <section className="login-brand">
          <div className="login-logo" aria-label="TrustLayer"><span>T</span></div>
          <div className="login-eyebrow">TRUSTLAYER / IDENTITY INFRASTRUCTURE</div>
          <h1>One security layer<br />for every application.</h1>
          <p>Wallet-free identity, policy-based access control, and security response in one operational platform.</p>
          <div className="login-points">
            <div><span>01</span><strong>Choose a demo identity</strong></div>
            <div><span>02</span><strong>Evaluate policy</strong></div>
            <div><span>03</span><strong>Authorize access</strong></div>
          </div>
        </section>
        <section className="login-card">
          <div className="login-card-header">
            <div className="login-card-kicker">DEMO ACCESS</div>
            <h2>Welcome to TrustLayer</h2>
            <p>Enter the operational workspace with a controlled demo identity. No wallet or blockchain connection is required.</p>
          </div>
          <div className="wallet-preview">
            <div className="wallet-icon"><span aria-hidden="true">ID</span></div>
            <div><strong>Demo identity</strong><span>Managed by TrustMesh policy</span></div>
          </div>
          <button className="connect-button" type="button" onClick={() => navigate("/portal")}>
            <span>Enter demo workspace</span><span className="button-arrow" aria-hidden="true">→</span>
          </button>
          <div className="login-security"><span className="login-security-icon">✓</span><p>Every protected action is checked and audited by the backend.</p></div>
          <div className="login-footer"><span>TrustLayer Authentication</span><span>Local demo mode</span></div>
        </section>
      </div>
    </main>
  );
}

export default Login;
