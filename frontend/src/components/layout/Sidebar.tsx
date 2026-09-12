import { NavLink } from "react-router-dom";

type IconName =
  | "overview"
  | "identity"
  | "policy"
  | "resource"
  | "asset"
  | "audit"
  | "security"
  | "recovery";

const navigation: Array<{
  label: string;
  path: string;
  icon: IconName;
}> = [
  { label: "Dashboard", path: "/dashboard", icon: "overview" },
  { label: "Identity", path: "/identities", icon: "identity" },
  { label: "Access Control", path: "/policies", icon: "policy" },
  { label: "Resources", path: "/resources", icon: "resource" },
  { label: "Assets", path: "/assets", icon: "asset" },
  { label: "Audit Log", path: "/audit", icon: "audit" },
  { label: "Security Center", path: "/security", icon: "security" },
  { label: "Recovery", path: "/recovery", icon: "recovery" },
];

function NavIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    overview: (
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5.5 9.5V20h13V9.5" />
        <path d="M9.5 20v-6h5v6" />
      </>
    ),
    identity: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </>
    ),
    policy: (
      <>
        <path d="m12 3 7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    resource: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
    asset: (
      <>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path d="m4.5 7.5 7.5 4 7.5-4M12 12v9" />
      </>
    ),
    audit: (
      <>
        <path d="M7 4h10v16H7z" />
        <path d="M9.5 8h5M9.5 12h5M9.5 16h3" />
      </>
    ),
    security: (
      <>
        <path d="M12 3 20 6v5c0 5-3.2 8-8 10-4.8-2-8-5-8-10V6l8-3Z" />
        <path d="M12 8v4" />
        <circle cx="12" cy="15.5" r=".7" fill="currentColor" stroke="none" />
      </>
    ),
    recovery: (
      <>
        <path d="M4 7a8 8 0 1 1 1 9" />
        <path d="M4 3v4h4" />
      </>
    ),
  };

  return (
    <svg
      className="nav-icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          T
        </div>

        <div className="brand-copy">
          <div className="brand-name">TrustMesh</div>
          <div className="brand-subtitle">Security Infrastructure</div>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Platform navigation">
        <div className="nav-label">PLATFORM</div>

        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="nav-icon">
              <NavIcon name={item.icon} />
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="nav-label nav-label-secondary">INTELLIGENCE</div>
        <NavLink
          to="/ai-security"
          className={({ isActive }) =>
            `nav-item nav-item-security ${isActive ? "active" : ""}`
          }
        >
          <span className="nav-icon"><NavIcon name="security" /></span>
          <span>AI Security</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <span className="network-dot" aria-hidden="true" />

        <div>
          <div className="network-title">Polygon Amoy</div>
          <div className="network-status">Development network</div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
