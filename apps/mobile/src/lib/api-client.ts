import { fetch as expoFetch } from "expo/fetch";

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(readonly status: number) {
    super(`API request failed with status ${status}`);
    this.name = "ApiError";
  }
}

export async function requestJson<T>(
  path: string,
  init: RequestInit,
  isExpectedResponse: (value: unknown) => value is T,
): Promise<T> {
  const response = await expoFetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) throw new ApiError(response.status);

  const payload: unknown = await response.json();
  if (!isExpectedResponse(payload)) {
    throw new Error("The server returned an invalid response.");
  }
  return payload;
}
