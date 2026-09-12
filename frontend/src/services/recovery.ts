import { api } from "./api";
import type { RecoveryResponse } from "../types/api";

export async function getRecoveryCenter(): Promise<RecoveryResponse> {
  return api.get<RecoveryResponse>("/recovery/");
}