import { Redirect } from "expo-router";
import { ChatScreen } from "../features/chat/ChatScreen";
import { useSession } from "../features/auth/session";

export default function ChatRoute() {
  const { session } = useSession();
  if (!session) return <Redirect href="/" />;
  return <ChatScreen session={session} />;
}
