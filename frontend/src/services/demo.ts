import { api } from "./api";

export interface DemoAccessResult {
  identity: string;
  subject: string;
  resource: string;
  resource_id: string;
  action: string;
  decision: "ALLOWED" | "DENIED";
  allowed: boolean;
  role?: string;
}

export interface AuthorizationRequest {
  org_id: string;
  did: string;
  role: string;
  resource_id: string;
  action: string;
}

export interface DemoAttackResult {
  status: string;
  decision: "DENIED";
  event_id: string;
  attack_type: string;
  identity: string;
  resource: string;
  action: string;
  severity: string;
  risk_score?: number;
  adaptive_state?: string;
  suspended?: boolean;
  incident_id?: string;
}

export interface AttackSimulationResult {
  mode: string;
  synthetic: boolean;
  attempts: DemoAttackResult[];
  final: DemoAttackResult;
}

export interface PolicySimulationResult {
  simulation: boolean;
  policy_mutated: boolean;
  identity: string;
  role: string;
  resource: string;
  action: string;
  current_decision: string;
  simulated_decision: string;
}

export function authorizeResource(
  request: AuthorizationRequest,
): Promise<DemoAccessResult> {
  return api.post<DemoAccessResult>("/demo/authorize", request);
}

export function simulateUnauthorizedAccess(
  request: AuthorizationRequest,
): Promise<DemoAttackResult> {
  return api.post<DemoAttackResult>("/demo/unauthorized-access", request);
}

export function simulateAttack(
  request: AuthorizationRequest,
): Promise<AttackSimulationResult> {
  return api.post<AttackSimulationResult>("/demo/simulate-attack", request);
}

export function simulatePolicyImpact(
  request: AuthorizationRequest & { simulated_decision: string },
): Promise<PolicySimulationResult> {
  return api.post<PolicySimulationResult>("/demo/policy-simulate", request);
}