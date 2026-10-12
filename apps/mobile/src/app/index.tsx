import { Redirect } from "expo-router";
import { SignInScreen } from "../features/auth/SignInScreen";
import { useSession } from "../features/auth/session";

export default function SignInRoute() {
  const { session } = useSession();
  if (session) return <Redirect href="/chat" />;
  return <SignInScreen />;
}
