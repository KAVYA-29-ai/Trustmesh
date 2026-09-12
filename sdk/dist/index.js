export class TrustMeshError extends Error {
    status;
    body;
    constructor(message, status, body) {
        super(message);
        this.status = status;
        this.body = body;
        this.name = "TrustMeshError";
    }
}
export class TrustMeshClient {
    baseUrl;
    apiKey;
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/$/, "");
        this.apiKey = options.apiKey;
    }
    async request(path, init) {
        const headers = new Headers(init.headers);
        headers.set("Content-Type", "application/json");
        headers.set("Accept", "application/json");
        if (this.apiKey) {
            headers.set("Authorization", `Bearer ${this.apiKey}`);
        }
        const response = await fetch(`${this.baseUrl}${path}`, {
            ...init,
            headers,
        });
        const text = await response.text();
        let body = undefined;
        if (text) {
            try {
                body = JSON.parse(text);
            }
            catch {
                body = text;
            }
        }
        if (!response.ok) {
            const detail = typeof body === "object" &&
                body !== null &&
                "detail" in body
                ? String(body.detail)
                : `TrustMesh request failed with status ${response.status}.`;
            throw new TrustMeshError(detail, response.status, body);
        }
        return body;
    }
    async accessCheck(input) {
        const result = await this.request("/access/check", {
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
    async auditLog(input) {
        return this.request("/audit/events", {
            method: "POST",
            body: JSON.stringify({
                event_name: input.eventName,
                contract_address: input.contractAddress,
                transaction_hash: input.transactionHash,
                block_number: input.blockNumber,
                log_index: input.logIndex,
                timestamp: input.timestamp ??
                    Math.floor(Date.now() / 1000),
                data: input.data ?? {},
            }),
        });
    }
    async getAlerts() {
        const result = await this.request("/security/findings", {
            method: "GET",
        });
        return {
            count: result.count,
            alerts: result.findings,
        };
    }
}
export function createTrustMeshClient(options) {
    return new TrustMeshClient(options);
}
