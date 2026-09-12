import { api } from "./api";
import type { AuditResponse } from "../types/api";

export async function getAuditEvents(): Promise<AuditResponse> {
  return api.get<AuditResponse>("/audit/");
}