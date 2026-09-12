export type TrustMeshDecision =
  | "ALLOW"
  | "DENY"
  | "STEP_UP"
  | string;

export interface TrustMeshClientOptions {
  baseUrl: string;
  apiKey?: string;
}

export interface AccessCheckInput {
  orgId: string;
  did: string;
  resourceId: string;
  action: string;
}

export interface AccessCheckResult {
  allowed: boolean;
  decision: TrustMeshDecision;
  reason: string;
}

export interface AuditLogInput {
  eventName: string;
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  logIndex: number;
  timestamp?: number;
  data?: Record<string, unknown>;
}

export interface AuditLogResult {
  status: string;
  event: {
    event_name: string;
    transaction_hash: string;
    block_number: number;
  };
}

export interface SecurityAlert {
  event_id: string;
  event_name: string;
  threat_detected: boolean;
  risk_score: number;
  severity: string;
  reason: string;
  recommendation: string;
}

export interface AlertsResult {
  count: number;
  alerts: SecurityAlert[];
}

export class TrustMeshError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "TrustMeshError";
  }
}

export class TrustMeshClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(options: TrustMeshClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
  }

  private async request<T>(
    path: string,
    init: RequestInit,
  ): Promise<T> {
    const headers = new Headers(init.headers);

    headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");

    if (this.apiKey) {
      headers.set(
        "Authorization",
        `Bearer ${this.apiKey}`,
      );
    }

    const response = await fetch(
      `${this.baseUrl}${path}`,
      {
        ...init,
        headers,
      },
    );

    const text = await response.text();

    let body: unknown = undefined;

    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    if (!response.ok) {
      const detail =
        typeof body === "object" &&
        body !== null &&
        "detail" in body
          ? String(
              (body as { detail: unknown }).detail,
            )
          : `TrustMesh request failed with status ${response.status}.`;

      throw new TrustMeshError(
        detail,
        response.status,
        body,
      );
    }

    return body as T;
  }

  async accessCheck(
    input: AccessCheckInput,
  ): Promise<AccessCheckResult> {
    const result = await this.request<{
      allowed: boolean;
      reason: string;
    }>("/access/check", {
      method: "POST",
      body: JSON.stringify({
        org_id: input.orgId,
        did: input.did,
        resource_id: input.resourceId,
        action: input.action,
      }),
    });

    return {
      allowed: result.allowed,
      decision: result.allowed
        ? "ALLOW"
        : "DENY",
      reason: result.reason,
    };
  }

  async auditLog(
    input: AuditLogInput,
  ): Promise<AuditLogResult> {
    return this.request<AuditLogResult>(
      "/audit/events",
      {
        method: "POST",
        body: JSON.stringify({
          event_name: input.eventName,
          contract_address: input.contractAddress,
          transaction_hash: input.transactionHash,
          block_number: input.blockNumber,
          log_index: input.logIndex,
          timestamp:
            input.timestamp ??
            Math.floor(Date.now() / 1000),
          data: input.data ?? {},
        }),
      },
    );
  }

  async getAlerts(): Promise<AlertsResult> {
    const result = await this.request<{
      count: number;
      findings: SecurityAlert[];
    }>("/security/findings", {
      method: "GET",
    });

    return {
      count: result.count,
      alerts: result.findings,
    };
  }
}

export function createTrustMeshClient(
  options: TrustMeshClientOptions,
): TrustMeshClient {
  return new TrustMeshClient(options);
}