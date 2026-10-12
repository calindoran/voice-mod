import { Redirect } from "expo-router";
import { ServerDirectoryScreen } from "../features/servers/ServerDirectoryScreen";
import { useSession } from "../features/auth/session";

export default function ServersRoute() {
  const { session, signOut } = useSession();
  if (!session) return <Redirect href="/" />;
  return <ServerDirectoryScreen session={session} onSignOut={signOut} />;
}
