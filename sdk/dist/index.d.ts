export type TrustMeshDecision = "ALLOW" | "DENY" | "STEP_UP" | string;
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
export declare class TrustMeshError extends Error {
    readonly status: number;
    readonly body?: unknown | undefined;
    constructor(message: string, status: number, body?: unknown | undefined);
}
export declare class TrustMeshClient {
    private readonly baseUrl;
    private readonly apiKey?;
    constructor(options: TrustMeshClientOptions);
    private request;
    accessCheck(input: AccessCheckInput): Promise<AccessCheckResult>;
    auditLog(input: AuditLogInput): Promise<AuditLogResult>;
    getAlerts(): Promise<AlertsResult>;
}
export declare function createTrustMeshClient(options: TrustMeshClientOptions): TrustMeshClient;
