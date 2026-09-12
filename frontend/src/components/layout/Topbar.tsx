import { useLocation } from "react-router-dom";

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

const pageNames: Record<string, string> = {
  "/dashboard": "Security posture",
  "/identities": "Identity",
  "/policies": "Access Control",
  "/resources": "Resources",
  "/assets": "Assets",
  "/audit": "Audit Log",
  "/security": "Security Center",
  "/recovery": "Recovery",
  "/ai-security": "AI Security",
};

function Topbar() {
  const location = useLocation();

  const currentPage =
    pageNames[location.pathname] ?? "Security Infrastructure";

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-title">TrustMesh</span>

        <span className="topbar-divider" aria-hidden="true" />

        <span className="topbar-context">{currentPage}</span>
      </div>

      <div className="topbar-right">
        <div className="live-status">
          <span className="live-status-dot" aria-hidden="true" />
          Protection active
        </div>

        <button
          className="icon-button"
          type="button"
          aria-label="Security notifications"
        >
          <BellIcon />
        </button>

        <button
          className="avatar"
          type="button"
          aria-label="TrustMesh account"
        >
          T
        </button>
      </div>
    </header>
  );
}

export default Topbar;