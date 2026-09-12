import { api } from "./api";
import type {
  SIWEMessageResponse,
  SIWENonceResponse,
  SIWEVerifyResponse,
} from "../types/api";

export async function getSIWENonce(
  address: string,
): Promise<SIWENonceResponse> {
  return api.post<SIWENonceResponse>(
    `/auth/siwe/nonce?address=${encodeURIComponent(address)}`,
    {},
  );
}

export async function createSIWEMessage(payload: {
  domain: string;
  address: string;
  statement?: string;
  uri: string;
  chain_id: number;
  nonce: string;
  issued_at: string;
}): Promise<SIWEMessageResponse> {
  return api.post<SIWEMessageResponse>("/auth/siwe/message", payload);
}

export async function verifySIWE(payload: {
  message: string;
  signature: string;
  address: string;
  nonce: string;
}): Promise<SIWEVerifyResponse> {
  return api.post<SIWEVerifyResponse>("/auth/siwe/verify", payload);
}