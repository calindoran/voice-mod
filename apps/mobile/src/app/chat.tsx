import { Redirect } from "expo-router";
import { useSession } from "../features/auth/session";

export default function LegacyChatRoute() {
  const { session } = useSession();
  return <Redirect href={session ? "/servers" : "/"} />;
}
