import { useEffect, useMemo, useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import StatusBadge from "../components/ui/StatusBadge";
import Icon from "../components/ui/Icon";
import { createAsset, getAssets } from "../services/assets";
import type { Asset } from "../types/api";

function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState("");

  const [assetName, setAssetName] = useState("");
  const [ownerDid, setOwnerDid] = useState("");
  const [assetType, setAssetType] = useState("Digital Record");
  const [accessLevel, setAccessLevel] = useState("Developer");
  const [policy, setPolicy] = useState("Default Policy");

  async function loadAssets() {
    try {
      setLoading(true);
      setError("");

      const response = await getAssets();

      setAssets(
        Array.isArray(response.assets)
          ? response.assets
          : [],
      );
    } catch (err) {
      console.error("Failed to load assets:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load assets.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAssets();
  }, []);

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return assets;
    }

    return assets.filter((asset) =>
      [
        asset.name,
        asset.asset_id,
        asset.asset_type,
        asset.owner,
        asset.policy,
        asset.access_level,
        asset.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [assets, search]);

  const activeCount = assets.filter(
    (asset) => asset.status === "Active",
  ).length;

  const protectedCount = assets.filter(
    (asset) => asset.status === "Protected",
  ).length;

  const typeCount = new Set(
    assets.map((asset) => asset.asset_type),
  ).size;

  function openRegisterModal() {
    setRegisterError("");
    setShowRegisterModal(true);
  }

  function closeRegisterModal() {
    if (registering) {
      return;
    }

    setShowRegisterModal(false);
    setRegisterError("");
  }

  function resetForm() {
    setAssetName("");
    setOwnerDid("");
    setAssetType("Digital Record");
    setAccessLevel("Developer");
    setPolicy("Default Policy");
    setRegisterError("");
  }

  async function handleRegisterAsset(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!assetName.trim()) {
      setRegisterError("Asset name is required.");
      return;
    }

    setRegistering(true);
    setRegisterError("");

    try {
      await createAsset({
        organization_id: "org-trustmesh",
        name: assetName.trim(),
        owner_did: ownerDid.trim() || undefined,
        metadata_json: {
          asset_type: assetType,
          access_level: accessLevel,
          policy: policy.trim() || "Default Policy",
        },
        status: "Active",
      });

      await loadAssets();

      resetForm();
      setShowRegisterModal(false);
    } catch (err) {
      console.error("Failed to register asset:", err);

      setRegisterError(
        err instanceof Error
          ? err.message
          : "Unable to register asset.",
      );
    } finally {
      setRegistering(false);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-area">
        <Topbar />

        <main className="dashboard">
          <section className="page-heading">
            <div>
              <div className="eyebrow">DIGITAL ASSET MANAGEMENT</div>

              <h1>Assets</h1>

              <p>
                Register, classify, and protect digital assets
                through TrustMesh policy controls.
              </p>
            </div>

            <div className="page-heading-actions">
              <StatusBadge>
                Asset layer ready
              </StatusBadge>

              <button
                type="button"
                className="primary-action"
                onClick={openRegisterModal}
              >
                <Icon name="asset" />
                Register asset
              </button>
            </div>
          </section>

          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">
                  TOTAL ASSETS
                </span>

                <span className="stat-icon">
                  <Icon name="asset" />
                </span>
              </div>

              <div className="stat-value">
                {loading ? "…" : assets.length}
              </div>

              <div className="stat-detail">
                Registered digital assets
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">
                  ACTIVE
                </span>

                <span className="stat-icon">
                  <Icon name="check" />
                </span>
              </div>

              <div className="stat-value">
                {loading ? "…" : activeCount}
              </div>

              <div className="stat-detail">
                Assets currently active
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">
                  PROTECTED
                </span>

                <span className="stat-icon">
                  <Icon name="shield" />
                </span>
              </div>

              <div className="stat-value">
                {loading ? "…" : protectedCount}
              </div>

              <div className="stat-detail">
                Assets under policy control
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">
                  ASSET TYPES
                </span>

                <span className="stat-icon">
                  <Icon name="database" />
                </span>
              </div>

              <div className="stat-value">
                {loading ? "…" : typeCount}
              </div>

              <div className="stat-detail">
                Registered asset categories
              </div>
            </div>
          </section>

          <section className="panel asset-panel">
            <div className="panel-header">
              <div>
                <div className="panel-kicker">
                  ASSET INVENTORY
                </div>

                <h2>Protected asset registry</h2>

                <p>
                  Assets are evaluated through identity, policy,
                  checkpoint, and enforcement controls.
                </p>
              </div>

              <div className="panel-header-meta">
                {loading
                  ? "Loading registry"
                  : `${filteredAssets.length} ${
                      filteredAssets.length === 1
                        ? "asset"
                        : "assets"
                    }`}
              </div>
            </div>

            <div className="identity-toolbar">
              <div className="identity-search">
                <span className="search-icon">
                  <Icon name="search" />
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search assets, owners, types or policies..."
                  aria-label="Search assets"
                />
              </div>

              <button
                type="button"
                className="secondary-action"
                onClick={openRegisterModal}
              >
                <Icon name="asset" />
                Register
              </button>
            </div>

            {loading ? (
              <div className="resource-empty">
                <div className="empty-icon">
                  <Icon name="asset" />
                </div>

                <h3>Loading asset registry</h3>

                <p>
                  Reading protected asset state from TrustMesh.
                </p>
              </div>
            ) : error ? (
              <div
                className="resource-empty resource-error"
                role="alert"
              >
                <div className="empty-icon">
                  <Icon name="shield" />
                </div>

                <h3>Asset registry unavailable</h3>

                <p>{error}</p>

                <button
                  type="button"
                  className="primary-action"
                  onClick={() => void loadAssets()}
                >
                  Retry
                </button>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="resource-empty">
                <div className="empty-icon">
                  <Icon name="search" />
                </div>

                <h3>
                  {search
                    ? "No matching assets"
                    : "No assets registered"}
                </h3>

                <p>
                  {search
                    ? "Try another search term."
                    : "Register an asset to create a protected asset boundary."}
                </p>

                {!search && (
                  <button
                    type="button"
                    className="primary-action"
                    onClick={openRegisterModal}
                  >
                    Register first asset
                  </button>
                )}
              </div>
            ) : (
              <div className="asset-table-wrapper">
                <div className="asset-table">
                  <div className="asset-table-header">
                    <span>ASSET</span>
                    <span>TYPE</span>
                    <span>OWNER</span>
                    <span>POLICY</span>
                    <span>ACCESS</span>
                    <span>STATUS</span>
                  </div>

                  {filteredAssets.map((asset) => (
                    <div
                      className="asset-row"
                      key={asset.asset_id}
                    >
                      <div className="asset-primary">
                        <span className="asset-icon">
                          <Icon name="asset" />
                        </span>

                        <div>
                          <strong>{asset.name}</strong>
                          <span>{asset.asset_id}</span>
                        </div>
                      </div>

                      <span className="asset-type">
                        {asset.asset_type}
                      </span>

                      <div className="asset-owner">
                        <strong>{asset.owner}</strong>
                        <span>Identity owner</span>
                      </div>

                      <span className="asset-policy">
                        {asset.policy}
                      </span>

                      <span className="asset-access">
                        {asset.access_level}
                      </span>

                      <StatusBadge>
                        {asset.status}
                      </StatusBadge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="asset-protection-grid">
            <article className="panel asset-protection-card">
              <div className="asset-protection-icon">
                <Icon name="shield" />
              </div>

              <div>
                <div className="panel-kicker">
                  PROTECTION MODEL
                </div>

                <h3>
                  Every asset gets a security boundary
                </h3>

                <p>
                  TrustMesh evaluates identity, policy,
                  checkpoint, risk and enforcement state before
                  protected operations are allowed.
                </p>
              </div>
            </article>

            <article className="panel asset-protection-card">
              <div className="asset-protection-icon">
                <Icon name="database" />
              </div>

              <div>
                <div className="panel-kicker">
                  ASSET LIFECYCLE
                </div>

                <h3>
                  Register → Protect → Monitor
                </h3>

                <p>
                  Registered assets become part of the TrustMesh
                  control plane and participate in audit and
                  security decisions.
                </p>
              </div>
            </article>
          </section>
        </main>
      </div>

      {showRegisterModal && (
        <div
          className="asset-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !registering
            ) {
              closeRegisterModal();
            }
          }}
        >
          <section
            className="asset-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="register-asset-title"
          >
            <div className="asset-modal-header">
              <div>
                <div className="eyebrow">
                  ASSET REGISTRY
                </div>

                <h2 id="register-asset-title">
                  Register asset
                </h2>

                <p>
                  Add a protected digital asset to TrustMesh.
                </p>
              </div>

              <button
                type="button"
                className="asset-modal-close"
                onClick={closeRegisterModal}
                disabled={registering}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleRegisterAsset}>
              <div className="asset-form-grid">
                <label>
                  Asset name
                  <input
                    value={assetName}
                    onChange={(event) =>
                      setAssetName(event.target.value)
                    }
                    placeholder="Research Dataset"
                    required
                  />
                </label>

                <label>
                  Owner DID
                  <input
                    value={ownerDid}
                    onChange={(event) =>
                      setOwnerDid(event.target.value)
                    }
                    placeholder="did:example:..."
                  />
                </label>

                <label>
                  Asset type
                  <select
                    value={assetType}
                    onChange={(event) =>
                      setAssetType(event.target.value)
                    }
                  >
                    <option>Digital Record</option>
                    <option>Dataset</option>
                    <option>Digital Certificate</option>
                    <option>Access Credential</option>
                  </select>
                </label>

                <label>
                  Access level
                  <select
                    value={accessLevel}
                    onChange={(event) =>
                      setAccessLevel(event.target.value)
                    }
                  >
                    <option>Developer</option>
                    <option>User</option>
                    <option>Manager</option>
                    <option>Auditor</option>
                    <option>Administrator</option>
                  </select>
                </label>

                <label className="asset-form-full">
                  Policy
                  <input
                    value={policy}
                    onChange={(event) =>
                      setPolicy(event.target.value)
                    }
                    placeholder="Default Policy"
                  />
                </label>
              </div>

              {registerError && (
                <div
                  className="asset-form-error"
                  role="alert"
                >
                  {registerError}
                </div>
              )}

              <div className="asset-modal-actions">
                <button
                  type="button"
                  className="secondary-action"
                  onClick={closeRegisterModal}
                  disabled={registering}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-action"
                  disabled={registering}
                >
                  {registering
                    ? "Registering..."
                    : "Register asset"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Assets;