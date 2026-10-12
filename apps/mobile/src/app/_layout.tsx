import "../lib/register-livekit";
import { Stack } from "expo-router";
import { SessionProvider } from "../features/auth/session";

export default function RootLayout() {
  return (
    <SessionProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SessionProvider>
  );
}
