import { api } from "./api";
import type { ResourcesResponse } from "../types/api";

export async function getResources(): Promise<ResourcesResponse> {
  return api.get<ResourcesResponse>("/resources/");
}