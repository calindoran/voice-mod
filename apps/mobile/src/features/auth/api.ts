import { ApiError, requestJson } from "../../lib/api-client";
import { AuthSession, isAuthSession } from "./types";

export async function signIn(phoneNumber: string, userName: string): Promise<AuthSession> {
  try {
    return await requestJson(
      "/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, userName }),
      },
      isAuthSession,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw new Error("That phone number and username are not on the access list.");
    }
    if (error instanceof ApiError && error.status === 422) {
      throw new Error("Enter a phone number with at least 10 digits.");
    }
    throw error;
  }
}

function isLogoutResponse(value: unknown): value is { status: string } {
  if (typeof value !== "object" || value === null) return false;
  return typeof (value as Record<string, unknown>).status === "string";
}

export async function signOut(token: string): Promise<void> {
  try {
    await requestJson(
      "/auth/logout",
      { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      isLogoutResponse,
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Error(`Could not revoke the sign-in session (server returned ${error.status}).`);
    }
    throw error;
  }
}
