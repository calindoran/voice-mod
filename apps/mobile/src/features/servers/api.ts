import { ApiError, requestJson, requestVoid } from "../../lib/api-client";
import { AuthSession } from "../auth/types";
import { CommunityServer, isCommunityServer, isVoiceToken, VoiceToken } from "./types";

function authHeaders(session: AuthSession): HeadersInit {
  return { Authorization: `Bearer ${session.token}` };
}

export async function getServers(session: AuthSession): Promise<CommunityServer[]> {
  return requestJson(
    "/servers",
    { headers: authHeaders(session) },
    (value): value is CommunityServer[] =>
      Array.isArray(value) && value.every(isCommunityServer),
  );
}

export async function getServer(
  session: AuthSession,
  serverId: string,
): Promise<CommunityServer> {
  return requestJson(
    `/servers/${encodeURIComponent(serverId)}`,
    { headers: authHeaders(session) },
    isCommunityServer,
  );
}

export async function createServer(
  session: AuthSession,
  name: string,
  description: string,
): Promise<CommunityServer> {
  return requestJson(
    "/servers",
    {
      method: "POST",
      headers: { ...authHeaders(session), "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    },
    isCommunityServer,
  );
}

export async function joinServer(
  session: AuthSession,
  serverId: string,
): Promise<CommunityServer> {
  return requestJson(
    `/servers/${encodeURIComponent(serverId)}/join`,
    { method: "POST", headers: authHeaders(session) },
    isCommunityServer,
  );
}

export async function leaveServer(session: AuthSession, serverId: string): Promise<void> {
  return requestVoid(`/servers/${encodeURIComponent(serverId)}/leave`, {
    method: "POST",
    headers: authHeaders(session),
  });
}

export async function getVoiceToken(
  session: AuthSession,
  serverId: string,
): Promise<VoiceToken> {
  try {
    return await requestJson(
      `/servers/${encodeURIComponent(serverId)}/voice-token`,
      { method: "POST", headers: authHeaders(session) },
      isVoiceToken,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 503) {
      throw new Error("Voice is not configured yet. Set the LiveKit values in the API .env file.");
    }
    if (error instanceof ApiError && error.status === 403) {
      throw new Error("Join this server before entering its voice room.");
    }
    throw error;
  }
}
