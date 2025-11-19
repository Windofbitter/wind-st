import axios from "axios";

// Use a relative base path in dev. Vite proxy maps /api to the backend.
const baseURL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const http = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface ApiErrorPayload {
  code?: string;
  message?: string;
}

export class ApiError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

export async function unwrap<T>(promise: Promise<{ data: T }>): Promise<T> {
  try {
    const { data } = await promise;
    return data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const payload = err.response?.data as ApiErrorPayload | undefined;
      const message =
        payload?.message ??
        err.message ??
        "Unknown error while calling backend API";
      const code = payload?.code;
      throw new ApiError(message, code);
    }
    throw err;
  }
}

