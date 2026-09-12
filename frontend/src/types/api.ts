export interface ServiceStatus {
  service: string;
  status: string;
}

export interface SIWENonceResponse {
  nonce: string;
}

export interface SIWEMessageResponse {
  message: string;
}

export interface SIWEVerifyResponse {
  address: string;
  session_id: string;
  message: string;
  authenticated: boolean;
}

export interface AuditEvent {
  event_name: string;
  contract_address: string;
  transaction_hash: string;
  block_number: number;
  log_index: number;
  timestamp: string | null;
  data: Record<string, unknown>;
}

export interface AuditResponse {
  service: string;
  status: string;
  count: number;
  events: AuditEvent[];
}

export interface Resource {
  resource_id: string;
  name: string;
  resource_type: string;
  application: string;
  owner: string;
  status: string;
  access_level: string;
}

export interface ResourcesResponse {
  service: string;
  status: string;
  count: number;
  resources: Resource[];
}

export interface Asset {
  asset_id: string;
  name: string;
  asset_type: string;
  owner: string;
  status: string;
  access_level: string;
  policy: string;
  token_id?: string | null;
  contract_address?: string | null;
}

export interface AssetsResponse {
  service: string;
  status: string;
  count: number;
  assets: Asset[];
}

export interface SecurityEvent {
  event_id: string;
  event_type: string;
  severity: string;
  subject: string;
  resource: string;
  status: string;
  description: string;
  attack_type?: string;
  action?: string;
  decision?: string;
}

export interface SecuritySummary {
  security_score: number;
  active_alerts: number;
  blocked_requests: number;
  events_reviewed: number;
}

export interface SecurityIncident {
  incident_id: string;
  identity: string;
  role: string;
  attack_type: string;
  threat_type: string;
  resource: string;
  action: string;
  violations: number;
  risk_score: number;
  severity: string;
  decision: string;
  suspended: boolean;
  created_at: string | null;
  timeline: Array<{
    stage: string;
    timestamp: string;
  }>;
  evidence: Array<{
    event_id: string;
    event: string;
    reason: string;
    synthetic: boolean;
  }>;
  response_metrics?: {
    attack_to_restriction_ms: number;
    detection_latency_ms: number;
    restriction_latency_ms: number;
    measured_from: string;
  };
}

export interface SecurityResponse {
  service: string;
  status: string;
  summary: SecuritySummary;
  events: SecurityEvent[];
  incidents?: SecurityIncident[];
}

export interface SecurityCopilotResponse {
  status: string;
  provider: string;
  incident_id?: string;
  analysis?: string;
  what_happened?: string;
  why_suspicious?: string;
  evidence?: Array<Record<string, unknown>>;
  risk_explanation?: string;
  recommendation: string;
}

export interface RecoveryRequest {
  request_id: string;
  subject: string;
  reason: string;
  status: string;
  approvals: number;
  required_approvals: number;
  timelock_hours: number;
}

export interface RecoverySummary {
  active_requests: number;
  pending_consensus: number;
  required_approvals: number;
  timelock_hours: number;
}

export interface RecoveryResponse {
  service: string;
  status: string;
  summary: RecoverySummary;
  requests: RecoveryRequest[];
}

export interface SecurityFinding {
  event_id: string;
  event_name: string;
  threat_detected: boolean;
  risk_score: number;
  severity: string;
  reason: string;
  recommendation: string;
}

export interface SecurityFindingsResponse {
  service: string;
  status: string;
  count: number;
  findings: SecurityFinding[];
}

export interface RiskGraphNode {
  id: string;
  label: string;
  type: string;
  risk: number;
}

export interface RiskGraphLink {
  source: string;
  target: string;
  relation: string;
}

export interface RiskGraphResponse {
  service: string;
  status: string;
  count: {
    nodes: number;
    links: number;
  };
  nodes: RiskGraphNode[];
  links: RiskGraphLink[];
  behavior?: {
    score: number;
    detected: boolean;
    state: string;
  };
  trust?: {
    score: number;
    state: string;
  };
}