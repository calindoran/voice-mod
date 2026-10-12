import { API_BASE_URL } from "../../lib/api-client";

export function connectToChat(): WebSocket {
  const webSocketBaseUrl = API_BASE_URL.replace(/^http/, "ws");
  return new WebSocket(`${webSocketBaseUrl}/ws/chat`);
}
