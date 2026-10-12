export interface ChatUser {
  id: string;
  phoneNumber: string;
  userName: string;
}

export interface AuthSession {
  token: string;
  user: ChatUser;
}

export function isChatUser(value: unknown): value is ChatUser {
  if (typeof value !== "object" || value === null) return false;
  const user = value as Record<string, unknown>;
  return (
    typeof user.id === "string" &&
    typeof user.phoneNumber === "string" &&
    typeof user.userName === "string"
  );
}

export function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== "object" || value === null) return false;
  const session = value as Record<string, unknown>;
  return typeof session.token === "string" && isChatUser(session.user);
}
