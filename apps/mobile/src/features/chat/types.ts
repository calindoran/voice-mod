import { ChatUser, isChatUser } from "../auth/types";

export interface ChatMessage {
  id: string;
  senderId: string;
  sender: string;
  text: string;
  createdAt: string;
}

export type ConnectionState = "connecting" | "connected" | "disconnected";

export type ChatServerFrame =
  | { type: "ready"; user: ChatUser }
  | { type: "history"; messages: ChatMessage[] }
  | { type: "message"; message: ChatMessage }
  | { type: "error"; message: string };

export function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Record<string, unknown>;
  return (
    typeof message.id === "string" &&
    typeof message.senderId === "string" &&
    typeof message.sender === "string" &&
    typeof message.text === "string" &&
    typeof message.createdAt === "string"
  );
}

export function isChatServerFrame(value: unknown): value is ChatServerFrame {
  if (typeof value !== "object" || value === null) return false;
  const frame = value as Record<string, unknown>;
  if (frame.type === "ready") return isChatUser(frame.user);
  if (frame.type === "history") {
    return Array.isArray(frame.messages) && frame.messages.every(isChatMessage);
  }
  if (frame.type === "message") return isChatMessage(frame.message);
  return frame.type === "error" && typeof frame.message === "string";
}
