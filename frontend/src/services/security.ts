import { api } from "./api";
import type {
  SecurityFindingsResponse,
  SecurityResponse,
  RiskGraphResponse,
  SecurityIncident,
  SecurityCopilotResponse,
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
