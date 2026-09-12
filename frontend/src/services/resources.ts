import { api } from "./api";
import type { ResourcesResponse } from "../types/api";

export async function getResources(): Promise<ResourcesResponse> {
  return api.get<ResourcesResponse>("/resources/");
}

export async function createResource(payload: {
  name: string;
  identifier: string;
  resource_type: string;
  application: string;
  owner: string;
  access_level: string;
}): Promise<{ resource: ResourcesResponse["resources"][number] }> {
  return api.post("/resources/", payload);
}