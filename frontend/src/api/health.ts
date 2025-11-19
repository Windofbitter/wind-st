import { http, unwrap } from "./httpClient";

export interface HealthStatus {
  status: "ok";
}

export async function getHealth(): Promise<HealthStatus> {
  return unwrap(http.get<HealthStatus>("/health"));
}

