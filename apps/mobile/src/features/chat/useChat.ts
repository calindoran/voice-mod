import { useCallback, useEffect, useRef, useState } from "react";
import { connectToChat } from "./api";
import { ChatMessage, ConnectionState, isChatServerFrame } from "./types";

export function useChat(serverId: string, token: string, onSessionExpired: () => void) {
  const socketRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionAttempt, setConnectionAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const socket = connectToChat(serverId);
    socketRef.current = socket;
    socket.onopen = () => {
      if (active) socket.send(JSON.stringify({ token }));
    };
    socket.onmessage = (event) => {
      if (typeof event.data !== "string") {
        setConnectionError("Received an unreadable response from the chat server.");
        return;
      }

      try {
        const data: unknown = JSON.parse(event.data);
        if (!isChatServerFrame(data)) throw new Error("Invalid chat response");
        switch (data.type) {
          case "ready":
            setConnectionState("connected");
            break;
          case "history":
            setMessages(data.messages);
            break;
          case "message":
            setMessages((current) => [...current, data.message]);
            break;
          case "error":
            setConnectionError(data.message);
            break;
        }
      } catch {
        setConnectionError("Received an invalid response from the chat server.");
      }
    };
    socket.onerror = () => {
      if (active) {
        setConnectionError("Could not reach the chat server. Check the API URL and try reconnecting.");
      }
    };
    socket.onclose = (event) => {
      if (!active) return;
      socketRef.current = null;
      setConnectionState("disconnected");
      if (event.code === 4401) onSessionExpired();
      else if (event.code === 4403) setConnectionError("Your membership to this server has ended.");
    };

    return () => {
      active = false;
      socket.close();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [serverId, token, connectionAttempt, onSessionExpired]);

  const sendMessage = useCallback((text: string): boolean => {
    const trimmedText = text.trim();
    const socket = socketRef.current;
    if (!trimmedText || socket?.readyState !== WebSocket.OPEN) {
      if (socket?.readyState !== WebSocket.OPEN) {
        setConnectionError("The chat is not connected yet. Reconnect before sending a message.");
      }
      return false;
    }

    socket.send(JSON.stringify({ text: trimmedText }));
    return true;
  }, []);

  const reconnect = useCallback(() => {
    setConnectionState("connecting");
    setConnectionError(null);
    setConnectionAttempt((attempt) => attempt + 1);
  }, []);

  return { messages, connectionState, connectionError, sendMessage, reconnect };
}
