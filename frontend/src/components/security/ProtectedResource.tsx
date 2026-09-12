import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  createTrustMeshClient,
  type TrustMeshDecision,
} from "@trustmesh/sdk";

interface ProtectedResourceProps {
  orgId: string;
  did: string;
  resourceId: string;
  action: string;
  children: ReactNode;
  fallback?: ReactNode;
}

const trustmesh = createTrustMeshClient({
  baseUrl:
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:8000",
});

function AccessLoading() {
  return (
    <div className="portal-protected-content">
      <strong>Checking TrustMesh access…</strong>
      <span>
        Identity and policy authorization are being evaluated.
      </span>
    </div>
  );
}

function AccessDenied({
  decision,
  reason,
}: {
  decision: TrustMeshDecision;
  reason: string;
}) {
  return (
    <div className="portal-decision denied">
      <strong>{decision}</strong>
      <span>{reason}</span>
    </div>
  );
}

export default function ProtectedResource({
  orgId,
  did,
  resourceId,
  action,
  children,
  fallback,
}: ProtectedResourceProps) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [decision, setDecision] =
    useState<TrustMeshDecision>("DENY");
  const [reason, setReason] = useState(
    "Access has not been evaluated.",
  );

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      setLoading(true);

      try {
        const result =
          await trustmesh.accessCheck({
            orgId,
            did,
            resourceId,
            action,
          });

        if (!mounted) return;

        setAllowed(result.allowed);
        setDecision(result.decision);
        setReason(result.reason);
      } catch (error) {
        if (!mounted) return;

        setAllowed(false);
        setDecision("DENY");
        setReason(
          error instanceof Error
            ? error.message
            : "TrustMesh authorization failed.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void checkAccess();

    return () => {
      mounted = false;
    };
  }, [
    orgId,
    did,
    resourceId,
    action,
  ]);

  if (loading) {
    return <AccessLoading />;
  }

  if (!allowed) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <AccessDenied
        decision={decision}
        reason={reason}
      />
    );
  }

  return <>{children}</>;
}