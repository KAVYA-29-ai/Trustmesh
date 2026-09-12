import { useEffect, useMemo, useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import StatusBadge from "../components/ui/StatusBadge";
import Icon from "../components/ui/Icon";
import { getResources } from "../services/resources";
import type { Resource } from "../types/api";

function Resources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadResources() {
      try {
        setError("");
        const response = await getResources();
        setResources(response.resources);
      } catch (error) {
        console.error("Failed to load resources:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load resources.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadResources();
  }, []);

  const filteredResources = useMemo(() => {
    const query = search.toLowerCase();

    return resources.filter((resource) =>
      `${resource.name} ${resource.resource_type} ${resource.application} ${resource.owner}`
        .toLowerCase()
        .includes(query),
    );
  }, [resources, search]);

  const protectedCount = resources.filter(
    (resource) => resource.status === "Protected",
  ).length;

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-area">
        <Topbar />

        <main className="dashboard">
          <section className="page-heading">
            <div>
              <div className="eyebrow">RESOURCE MANAGEMENT</div>
              <h1>Resources</h1>
              <p>
                Register and protect the applications, data, and assets
                controlled by TrustLayer policies.
              </p>
            </div>

            <StatusBadge>Resource layer ready</StatusBadge>
          </section>

          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">TOTAL RESOURCES</span>
                <span className="stat-icon"><Icon name="resource" /></span>
              </div>
              <div className="stat-value">
                {loading ? "…" : resources.length}
              </div>
              <div className="stat-detail">
                Registered protected resources
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">PROTECTED</span>
                <span className="stat-icon"><Icon name="check" /></span>
              </div>
              <div className="stat-value">
                {loading ? "…" : protectedCount}
              </div>
              <div className="stat-detail">
                Resources enforcing policies
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">APPLICATIONS</span>
                <span className="stat-icon"><Icon name="database" /></span>
              </div>
              <div className="stat-value">
                {loading
                  ? "…"
                  : new Set(resources.map((resource) => resource.application))
                      .size}
              </div>
              <div className="stat-detail">
                Connected applications
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">ACCESS MODEL</span>
                <span className="stat-icon"><Icon name="policy" /></span>
              </div>
              <div className="stat-value">RBAC</div>
              <div className="stat-detail">
                Policy-controlled authorization
              </div>
            </div>
          </section>

          <section className="panel resource-panel">
            <div className="panel-header">
              <div>
                <div className="panel-kicker">RESOURCE DIRECTORY</div>
                <h2>Protected resources</h2>
              </div>

              <button type="button" className="primary-action">
                + Register resource
              </button>
            </div>

            <div className="identity-toolbar">
              <div className="identity-search">
                <span className="search-icon"><Icon name="search" /></span>
                <input
                  type="text"
                  placeholder="Search resources..."
                  aria-label="Search resources"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <button
                type="button"
                className="filter-button"
                aria-label="Filter resources"
              >
                All resources
                <span className="filter-chevron">⌄</span>
              </button>
            </div>

            {loading ? (
              <div className="resource-empty" aria-live="polite">
                <div className="empty-icon"><Icon name="resource" /></div>
                <h3>Loading resources</h3>
                <p>Reading the TrustLayer resource registry.</p>
              </div>
            ) : error ? (
              <div className="resource-empty resource-error" role="alert">
                <div className="empty-icon"><Icon name="shield" /></div>
                <h3>Resources unavailable</h3>
                <p>{error}</p>
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="resource-empty">
                <div className="empty-icon"><Icon name="search" /></div>
                <h3>No resources found</h3>
                <p>Try a different resource or application name.</p>
              </div>
            ) : (
              <div className="resource-table">
                <div className="resource-table-header">
                  <span>RESOURCE</span>
                  <span>TYPE</span>
                  <span>APPLICATION</span>
                  <span>ACCESS</span>
                  <span>STATUS</span>
                </div>

                {filteredResources.map((resource) => (
                  <div
                    className="resource-row"
                    key={resource.resource_id}
                  >
                    <div className="resource-primary">
                      <span className="resource-icon"><Icon name="resource" /></span>

                      <div>
                        <strong>{resource.name}</strong>
                        <span>{resource.resource_id}</span>
                      </div>
                    </div>

                    <span className="resource-type">
                      {resource.resource_type}
                    </span>

                    <div className="resource-application">
                      <strong>{resource.application}</strong>
                      <span>Owner: {resource.owner}</span>
                    </div>

                    <span className="resource-access">
                      {resource.access_level}
                    </span>

                    <StatusBadge>{resource.status}</StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default Resources;