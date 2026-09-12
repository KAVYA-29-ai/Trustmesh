import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { connectWallet, signMessage } from "../services/wallet";
import Icon from "../components/ui/Icon";

function Login() {
  const navigate = useNavigate();
  const { loading, error, prepareSIWE, completeSIWE } = useAuth();

  const [wallet, setWallet] = useState<string | null>(null);
  const [step, setStep] = useState<
    "idle" | "connecting" | "signing" | "success"
  >("idle");
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleConnect() {
    setLocalError(null);

    try {
      setStep("connecting");

      const address = await connectWallet();

      setWallet(address);

      const { nonce, message } = await prepareSIWE(address);

      setStep("signing");

      const signature = await signMessage(message);

      await completeSIWE(
        address,
        nonce,
        message,
        signature,
      );

      setStep("success");

      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (err) {
      setStep("idle");

      setLocalError(
        err instanceof Error
          ? err.message
          : "Wallet authentication failed.",
      );
    }
  }

  const displayError = localError || error;

  return (
    <main className="login-page">
      <div className="login-grid">
        <section className="login-brand">
          <div className="login-logo" aria-label="TrustLayer">
            <span>T</span>
          </div>

          <div className="login-eyebrow">
            TRUSTLAYER / IDENTITY INFRASTRUCTURE
          </div>

          <h1>
            One security layer
            <br />
            for every application.
          </h1>

          <p>
            Decentralized identity, policy-based access control,
            and verifiable digital assets in one security platform.
          </p>

          <div className="login-points">
            <div>
              <span>01</span>
              <strong>Verify identity</strong>
            </div>

            <div>
              <span>02</span>
              <strong>Evaluate policy</strong>
            </div>

            <div>
              <span>03</span>
              <strong>Authorize access</strong>
            </div>
          </div>
        </section>

        <section className="login-card">
          <div className="login-card-header">
            <div className="login-card-kicker">SECURE SIGN IN</div>

            <h2>Welcome to TrustLayer</h2>

            <p>
              Connect your wallet to establish your decentralized
              identity.
            </p>
          </div>

          <div className="wallet-preview">
            <div className="wallet-icon"><Icon name="identity" /></div>

            <div>
              <strong>
                {wallet
                  ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
                  : "Ethereum wallet"}
              </strong>

              <span>
                {wallet
                  ? "Wallet connected"
                  : "MetaMask or compatible wallet"}
              </span>
            </div>
          </div>

          <button
            className="connect-button"
            onClick={handleConnect}
            disabled={loading || step !== "idle"}
          >
            <span>
              {step === "connecting" && "Connecting wallet..."}
              {step === "signing" && "Sign message in wallet..."}
              {step === "success" && "Authentication successful"}
              {step === "idle" && "Connect wallet"}
            </span>

            <span className="button-arrow" aria-hidden="true"><Icon name="arrow" /></span>
          </button>

          {displayError && (
            <div className="login-error">
              {displayError}
            </div>
          )}

          <div className="login-security">
            <span className="login-security-icon"><Icon name="shield" /></span>
            <p>
              You will sign a secure SIWE message.
              No private keys leave your wallet.
            </p>
          </div>

          <div className="login-footer">
            <span>TrustLayer Authentication</span>
            <span>EIP-4361 / SIWE</span>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Login;