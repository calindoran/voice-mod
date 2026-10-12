export interface CommunityServer {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerName: string;
  memberCount: number;
  isMember: boolean;
  createdAt: string;
}

export interface VoiceToken {
  livekitUrl: string;
  token: string;
  roomName: string;
}

export function isCommunityServer(value: unknown): value is CommunityServer {
  if (typeof value !== "object" || value === null) return false;
  const server = value as Record<string, unknown>;
  return (
    typeof server.id === "string" &&
    typeof server.name === "string" &&
    typeof server.description === "string" &&
    typeof server.ownerId === "string" &&
    typeof server.ownerName === "string" &&
    typeof server.memberCount === "number" &&
    typeof server.isMember === "boolean" &&
    typeof server.createdAt === "string"
  );
}

export function isVoiceToken(value: unknown): value is VoiceToken {
  if (typeof value !== "object" || value === null) return false;
  const token = value as Record<string, unknown>;
  return (
    typeof token.livekitUrl === "string" &&
    typeof token.token === "string" &&
    typeof token.roomName === "string"
  );
}
