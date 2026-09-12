import { api } from "./api";
import type { AssetsResponse } from "../types/api";

export async function getAssets(): Promise<AssetsResponse> {
  return api.get<AssetsResponse>("/assets/");
}

export interface CreateAssetPayload {
  organization_id: string;
  name: string;
  owner_did?: string;
  metadata_json: {
    asset_type: string;
    access_level: string;
    policy: string;
  };
  status: string;
}

export async function createAsset(
  payload: CreateAssetPayload,
): Promise<any> {
  return api.post("/assets/", payload);
}
