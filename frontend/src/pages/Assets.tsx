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
  const [assetName, setAssetName] = useState("");
  const [ownerDid, setOwnerDid] = useState("");
  const [assetType, setAssetType] = useState("Digital Record");
  const [accessLevel, setAccessLevel] = useState("Developer");
  const [policy, setPolicy] = useState("Default Policy");
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState("");


  useEffect(() => {
    async function loadAssets() {
      try {
        setError("");
        const response = await getAssets();
        setAssets(response.assets);
      } catch (error) {
        console.error("Failed to load assets:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load assets.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadAssets();
  }, []);

  const filteredAssets = useMemo(() => {
    const query = search.toLowerCase();

    return assets.filter((asset) =>
      `${asset.name} ${asset.asset_id} ${asset.asset_type} ${asset.owner} ${asset.policy}`
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


  const handleRegisterAsset = async (event: React.FormEvent<HTMLFormElement>) => {
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

      setShowRegisterModal(false);
      setAssetName("");
      setOwnerDid("");
      setAssetType("Digital Record");
      setAccessLevel("Developer");
      setPolicy("Default Policy");

      const refreshed = await getAssets();
      setAssets(refreshed.assets);
    } catch (error) {
      setRegisterError(
        error instanceof Error ? error.message : "Unable to register asset.",
      );
    } finally {
      setRegistering(false);
    }
  };

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
                Manage digital assets and enforce policy-controlled
                access across TrustLayer.
              </p>
            </div>

            <StatusBadge>Asset layer ready</StatusBadge>
          </section>

          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">TOTAL ASSETS</span>
                <span className="stat-icon"><Icon name="asset" /></span>
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
                <span className="stat-label">ACTIVE</span>
                <span className="stat-icon"><Icon name="check" /></span>
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
                <span className="stat-label">PROTECTED</span>
                <span className="stat-icon"><Icon name="shield" /></span>
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
                <span className="stat-label">ASSET TYPES</span>
                <span className="stat-icon"><Icon name="database" /></span>
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
                <div className="panel-kicker">ASSET INVENTORY</div>
                <h2>Digital assets</h2>
              </div>

              <button type="button" className="primary-action">
                + Register asset
              </button>
            </div>

            <div className="identity-toolbar">
              <div className="identity-search">
                <span className="search-icon"><Icon name="search" /></span>

                <input
                  type="text"
                  placeholder="Search assets..."
                  aria-label="Search assets"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <button
                type="button"
                className="filter-button"
                aria-label="Filter assets"
              >
                All assets
                <span className="filter-chevron">⌄</span>
              </button>
            </div>

            {loading ? (
              <div className="resource-empty" aria-live="polite">
                <div className="empty-icon"><Icon name="asset" /></div>

                <h3>Loading assets</h3>

                <p>
                  Reading the TrustLayer asset registry.
                </p>
              </div>
            ) : error ? (
              <div className="resource-empty resource-error" role="alert">
                <div className="empty-icon"><Icon name="shield" /></div>
                <h3>Assets unavailable</h3>
                <p>{error}</p>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="resource-empty">
                <div className="empty-icon"><Icon name="search" /></div>

                <h3>No assets found</h3>

                <p>
                  Try a different asset, owner, or policy name.
                </p>
              </div>
            ) : (
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
                      <span className="asset-icon"><Icon name="asset" /></span>

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

                    <StatusBadge>{asset.status}</StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {showRegisterModal && (
        <div
          className="asset-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !registering) {
              setShowRegisterModal(false);
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
                <span className="eyebrow">Asset registry</span>
                <h2 id="register-asset-title">Register asset</h2>
                <p>Add a protected digital asset to TrustLayer.</p>
              </div>

              <button
                type="button"
                className="asset-modal-close"
                aria-label="Close register asset dialog"
                disabled={registering}
                onClick={() => setShowRegisterModal(false)}
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
                    onChange={(event) => setAssetName(event.target.value)}
                    placeholder="e.g. Research Dataset"
                    required
                    autoFocus
                  />
                </label>

                <label>
                  Owner DID
                  <input
                    value={ownerDid}
                    onChange={(event) => setOwnerDid(event.target.value)}
                    placeholder="did:ethr:0x..."
                  />
                </label>

                <label>
                  Asset type
                  <select
                    value={assetType}
                    onChange={(event) => setAssetType(event.target.value)}
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
                    onChange={(event) => setAccessLevel(event.target.value)}
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
                    onChange={(event) => setPolicy(event.target.value)}
                    placeholder="Default Policy"
                  />
                </label>
              </div>

              {registerError && (
                <div className="asset-form-error" role="alert">
                  {registerError}
                </div>
              )}

              <div className="asset-modal-actions">
                <button
                  type="button"
                  className="secondary-action"
                  disabled={registering}
                  onClick={() => setShowRegisterModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-action"
                  disabled={registering}
                >
                  {registering ? "Registering…" : "Register asset"}
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
