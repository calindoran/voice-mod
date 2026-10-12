import { Redirect, useLocalSearchParams } from "expo-router";
import { CommunityServerScreen } from "../../features/servers/CommunityServerScreen";
import { useSession } from "../../features/auth/session";

export default function ServerRoute() {
  const { session, clearSession } = useSession();
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  if (!session) return <Redirect href="/" />;
  return <CommunityServerScreen session={session} serverId={serverId} onSessionExpired={clearSession} />;
}
