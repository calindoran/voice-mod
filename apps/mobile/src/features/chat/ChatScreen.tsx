import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ConnectionStatus } from "../../components/chat/ConnectionStatus";
import { colors } from "../../theme/colors";
import { useSession } from "../auth/session";
import { AuthSession } from "../auth/types";
import { MessageComposer } from "./MessageComposer";
import { MessageList } from "./MessageList";
import { useChat } from "./useChat";

interface ChatScreenProps {
  session: AuthSession;
}

export function ChatScreen({ session }: ChatScreenProps) {
  const { clearSession, signOut } = useSession();
  const { messages, connectionState, connectionError, sendMessage, reconnect } = useChat(
    session.token,
    clearSession,
  );
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      Alert.alert(
        "Sign out",
        error instanceof Error ? error.message : "The session could not be revoked.",
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.identity}>
          <Text style={styles.eyebrow}>VOICE MOD</Text>
          <Text style={styles.title}>The room</Text>
          <Text style={styles.subtitle}>Signed in as {session.user.userName}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={isSigningOut}
          onPress={() => void handleSignOut()}
          style={styles.signOutButton}
        >
          <Text style={styles.signOutText}>{isSigningOut ? "Signing out..." : "Sign out"}</Text>
        </Pressable>
      </View>

      <ConnectionStatus
        state={connectionState}
        error={connectionError}
        onReconnect={reconnect}
      />
      <MessageList messages={messages} currentUserId={session.user.id} />
      <MessageComposer isConnected={connectionState === "connected"} onSend={sendMessage} />
      <Text style={styles.footnote}>Messages are stored in memory and cleared when the server restarts.</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: Platform.OS === "ios" ? 62 : 30,
    paddingBottom: 18,
  },
  identity: { gap: 3 },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: "700", letterSpacing: 1.6 },
  title: { color: colors.text, fontSize: 25, fontWeight: "700", marginTop: 3 },
  subtitle: { color: colors.muted, fontSize: 12 },
  signOutButton: { backgroundColor: colors.surfaceRaised, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  signOutText: { color: colors.text, fontSize: 12, fontWeight: "600" },
  footnote: { color: colors.muted, fontSize: 10, paddingHorizontal: 20, paddingTop: 9, paddingBottom: 14, textAlign: "center" },
});
