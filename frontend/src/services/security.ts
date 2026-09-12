import { api } from "./api";
import type {
  SecurityFindingsResponse,
  SecurityResponse,
  RiskGraphResponse,
  SecurityIncident,
  SecurityCopilotResponse,
  SecurityRiskResponse,
  DpdpReportResponse,
} from "../types/api";

export async function getSecurityCenter(): Promise<SecurityResponse> {
  return api.get<SecurityResponse>("/security/");
}

export async function getSecurityFindings(): Promise<SecurityFindingsResponse> {
  return api.get<SecurityFindingsResponse>("/security/findings");
}

export async function getRiskGraph(): Promise<RiskGraphResponse> {
  return api.get<RiskGraphResponse>("/security/risk-graph");
}

export async function getWorkflowGraph(): Promise<RiskGraphResponse> {
  return api.get<RiskGraphResponse>("/security/workflow-graph");
}

export async function getSecurityIncidents(): Promise<{ incidents: SecurityIncident[] }> {
  return api.get<{ incidents: SecurityIncident[] }>("/security/incidents");
}

export async function getSecurityCopilot(): Promise<SecurityCopilotResponse> {
  return api.get<SecurityCopilotResponse>("/security/copilot");
}

export async function getSecurityRisk(): Promise<SecurityRiskResponse> {
  return api.get<SecurityRiskResponse>("/security/risk-score");
}

export async function getDpdpReport(): Promise<DpdpReportResponse> {
  return api.get<DpdpReportResponse>("/security/reports/dpdp");
}

export async function getIdentitySecurityStatus(
  did: string,
): Promise<{ identity: string; status: string }> {
  return api.get<{ identity: string; status: string }>(
    `/security/identities/${encodeURIComponent(did)}/status`,
  );
}

export async function decideSecurityIncident(
  incidentId: string,
  decision: "ACCEPT" | "SUSPEND" | "BLOCK",
): Promise<{
  decision: {
    status: string;
    decision: string;
    on_chain_enforcement?: { status: string; transaction_hash?: string };
  };
}> {
  return api.post(`/security/incidents/${encodeURIComponent(incidentId)}/decision`, { decision });
}
