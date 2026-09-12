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

function Topbar() {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>Workspace</span>
        <span className="breadcrumb-separator">/</span>
        <strong>Overview</strong>
      </div>

      <div className="topbar-actions">
        <button className="icon-button" aria-label="Notifications">
          <BellIcon />
        </button>

        <div className="wallet-chip">
          <span className="wallet-status wallet-status-ready" aria-hidden="true" />
          <span>TrustMesh platform</span>
        </div>

        <button className="avatar" aria-label="Account">
          K
        </button>
      </div>
    </header>
  );
}

export default Topbar;
