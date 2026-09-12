import { useEffect, useMemo, useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import StatusBadge from "../components/ui/StatusBadge";
import Icon from "../components/ui/Icon";
import { createResource, getResources } from "../services/resources";
import type { Resource } from "../types/api";

function Resources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    identifier: "",
    resource_type: "Protected Resource",
    application: "Acme Organization",
    owner: "TrustMesh Admin",
    access_level: "Restricted",
  });

  async function loadResources() {
    try {
      setError("");

      const response = await getResources();

      setResources(response.resources);
    } catch (requestError) {
      console.error("Failed to load resources:", requestError);

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load resources.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadResources();
  }, []);

  async function handleCreate(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    try {
      setError("");

      await createResource(form);

      setForm({
        name: "",
        identifier: "",
        resource_type: "Protected Resource",
        application: "Acme Organization",
        owner: "TrustMesh Admin",
        access_level: "Restricted",
      });

      setShowForm(false);

      await loadResources();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to register resource.",
      );
    }
  }

  const filteredResources = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return resources;
    }

    return resources.filter((resource) =>
      `${resource.name} ${resource.resource_type} ${resource.application} ${resource.owner} ${resource.resource_id} ${resource.access_level}`
        .toLowerCase()
        .includes(query),
    );
  }, [resources, search]);

  const protectedCount = resources.filter(
    (resource) => resource.status === "Protected",
  ).length;

  const applicationCount = new Set(
    resources.map((resource) => resource.application),
  ).size;

  const restrictedCount = resources.filter(
    (resource) => resource.access_level === "Restricted",
  ).length;

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-area">
        <Topbar />

        <main className="page">
          <header className="page-header">
            <div className="page-header-copy">
              <div className="page-eyebrow">
                PROTECTED SURFACES
              </div>

              <h1 className="page-title">
                Resources
              </h1>

              <p className="page-description">
                Register the applications, data, and protected
                surfaces that TrustMesh evaluates before allowing
                sensitive actions.
              </p>
            </div>

            <div className="page-actions">
              <span className="live-status">
                <span className="live-status-dot" />
                Resource protection active
              </span>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  setShowForm((visible) => !visible)
                }
              >
                {showForm
                  ? "Close"
                  : "+ Register resource"}
              </button>
            </div>
          </header>

          <section className="metric-strip">
            <div className="metric-card">
              <div className="metric-label">
                Total resources
              </div>

              <div className="metric-value">
                {loading ? "—" : resources.length}
              </div>

              <div className="metric-meta">
                Registered protected surfaces
              </div>
            </div>

            <div className="metric-card success">
              <div className="metric-label">
                Protected
              </div>

              <div className="metric-value">
                {loading ? "—" : protectedCount}
              </div>

              <div className="metric-meta">
                Resources enforcing protection
              </div>
            </div>

            <div className="metric-card warning">
              <div className="metric-label">
                Restricted
              </div>

              <div className="metric-value">
                {loading ? "—" : restrictedCount}
              </div>

              <div className="metric-meta">
                Require controlled authorization
              </div>
            </div>
          </section>

          <section
            className="panel"
            style={{ marginTop: 14 }}
          >
            <div className="panel-header">
              <div>
                <div className="panel-kicker">
                  RESOURCE REGISTRY
                </div>

                <h2>Protected resources</h2>

                <p className="panel-description">
                  Resources become security boundaries for
                  protected application actions.
                </p>
              </div>

              <span className="badge badge-info">
                {applicationCount} application
                {applicationCount === 1 ? "" : "s"}
              </span>
            </div>

            {showForm && (
              <form
                onSubmit={handleCreate}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(0, 1fr) minmax(0, 1fr) auto",
                  gap: 10,
                  padding: "16px 20px",
                  borderBottom:
                    "1px solid #151c22",
                }}
              >
                <input
                  className="input"
                  required
                  placeholder="Resource name"
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                    })
                  }
                />

                <input
                  className="input"
                  required
                  placeholder="Resource identifier"
                  value={form.identifier}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      identifier: event.target.value,
                    })
                  }
                />

                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Create protected resource
                </button>
              </form>
            )}

            <div
              style={{
                display: "flex",
                gap: 10,
                padding: "16px 20px",
                borderBottom:
                  "1px solid #151c22",
                flexWrap: "wrap",
              }}
            >
              <input
                className="input"
                style={{
                  flex: "1 1 300px",
                }}
                type="search"
                placeholder="Search resource, application, owner, or identifier..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

              <button
                type="button"
                className="btn"
                onClick={() => setSearch("")}
              >
                Clear
              </button>
            </div>

            {error && (
              <div
                className="error-state"
                style={{ margin: 16 }}
                role="alert"
              >
                {error}
              </div>
            )}

            {loading ? (
              <div className="loading-state">
                Reading resource registry…
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="empty-state">
                <Icon name="resource" />

                <p>
                  {search
                    ? "No resources match the current search."
                    : "No protected resources are registered yet."}
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Resource</th>
                      <th>Type</th>
                      <th>Application</th>
                      <th>Access</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredResources.map((resource) => (
                      <tr
                        key={resource.resource_id}
                      >
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                display: "grid",
                                placeItems: "center",
                                flexShrink: 0,
                                border:
                                  "1px solid #27313a",
                                borderRadius: 7,
                                background:
                                  "#11161b",
                                color: "#9ca8b2",
                              }}
                            >
                              <Icon name="resource" />
                            </div>

                            <div>
                              <div
                                style={{
                                  color: "#d5dce2",
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}
                              >
                                {resource.name}
                              </div>

                              <div
                                style={{
                                  marginTop: 4,
                                  color: "#596570",
                                  fontFamily:
                                    "monospace",
                                  fontSize: 9,
                                }}
                              >
                                {resource.resource_id}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span
                            style={{
                              color: "#9da8b2",
                            }}
                          >
                            {resource.resource_type}
                          </span>
                        </td>

                        <td>
                          <div>
                            <div
                              style={{
                                color: "#b5bec7",
                                fontSize: 10,
                                fontWeight: 600,
                              }}
                            >
                              {resource.application}
                            </div>

                            <div
                              style={{
                                marginTop: 3,
                                color: "#596570",
                                fontSize: 9,
                              }}
                            >
                              Owner: {resource.owner}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span
                            className={
                              resource.access_level ===
                              "Restricted"
                                ? "badge badge-warning"
                                : "badge"
                            }
                          >
                            {resource.access_level}
                          </span>
                        </td>

                        <td>
                          <StatusBadge
                            variant={
                              resource.status ===
                              "Protected"
                                ? "success"
                                : "warning"
                            }
                          >
                            {resource.status}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section
            className="panel"
            style={{ marginTop: 14 }}
          >
            <div className="panel-header">
              <div>
                <div className="panel-kicker">
                  PROTECTION MODEL
                </div>

                <h2>
                  Resource protection lifecycle
                </h2>

                <p className="panel-description">
                  TrustMesh places the security checkpoint
                  between an identity request and the protected
                  application action.
                </p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(5, minmax(0, 1fr))",
              }}
            >
              {[
                {
                  number: "01",
                  title: "Application",
                  text: "Application registers a protected surface.",
                },
                {
                  number: "02",
                  title: "Resource",
                  text: "Sensitive resource is placed under control.",
                },
                {
                  number: "03",
                  title: "Checkpoint",
                  text: "Incoming protected action is intercepted.",
                },
                {
                  number: "04",
                  title: "Policy",
                  text: "Identity, role, and policy are evaluated.",
                },
                {
                  number: "05",
                  title: "Decision",
                  text: "Action is allowed or rejected.",
                },
              ].map((step) => (
                <div
                  key={step.number}
                  style={{
                    padding: "22px 20px",
                    borderRight:
                      "1px solid #151c22",
                  }}
                >
                  <div
                    style={{
                      color: "#4f5b66",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                    }}
                  >
                    {step.number}
                  </div>

                  <div
                    style={{
                      marginTop: 11,
                      color: "#d0d7de",
                      fontFamily:
                        "Space Grotesk, sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {step.title}
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      color: "#626e78",
                      fontSize: 9,
                      lineHeight: 1.55,
                    }}
                  >
                    {step.text}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            className="metric-strip"
            style={{ marginTop: 14 }}
          >
            <div className="metric-card">
              <div className="metric-label">
                Protected surface
              </div>

              <div
                style={{
                  marginTop: 9,
                  color: "#d8e0e7",
                  fontFamily:
                    "Space Grotesk, sans-serif",
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                Resource boundary
              </div>

              <div className="metric-meta">
                The resource defines what must be protected.
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">
                Security checkpoint
              </div>

              <div
                style={{
                  marginTop: 9,
                  color: "#83bfff",
                  fontFamily:
                    "Space Grotesk, sans-serif",
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                Action interception
              </div>

              <div className="metric-meta">
                Requests are evaluated before execution.
              </div>
            </div>

            <div className="metric-card danger">
              <div className="metric-label">
                Enforcement
              </div>

              <div
                style={{
                  marginTop: 9,
                  color: "#ff7180",
                  fontFamily:
                    "Space Grotesk, sans-serif",
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                Adaptive response
              </div>

              <div className="metric-meta">
                Risk can escalate access restrictions.
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Resources;