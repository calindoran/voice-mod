import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ConnectionStatus } from "../../components/chat/ConnectionStatus";
import { colors } from "../../theme/colors";
import { Button } from "../../ui/Button";
import { AuthSession } from "../auth/types";
import { MessageComposer } from "../chat/MessageComposer";
import { MessageList } from "../chat/MessageList";
import { useChat } from "../chat/useChat";
import { VoiceRoom } from "../voice/VoiceRoom";
import { getServer, getVoiceToken, joinServer, leaveServer } from "./api";
import { CommunityServer, VoiceToken } from "./types";

interface CommunityServerScreenProps {
  session: AuthSession;
  serverId: string;
  onSessionExpired: () => void;
}

export function CommunityServerScreen({ session, serverId, onSessionExpired }: CommunityServerScreenProps) {
  const [joinError, setJoinError] = useState<string | null>(null);
  const [loadedServer, setLoadedServer] = useState<{
    serverId: string;
    server: CommunityServer | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let active = true;
    void getServer(session, serverId)
      .then((result) => {
        if (active) setLoadedServer({ serverId, server: result, error: null });
      })
      .catch((requestError: unknown) => {
        if (active) {
          setLoadedServer({
            serverId,
            server: null,
            error: requestError instanceof Error ? requestError.message : "Could not load this server.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [serverId, session]);

  async function handleJoin() {
    setJoinError(null);
    try {
      setLoadedServer({ serverId, server: await joinServer(session, serverId), error: null });
    } catch (requestError) {
      setJoinError(requestError instanceof Error ? requestError.message : "Could not join this server.");
    }
  }

  const loading = loadedServer?.serverId !== serverId;
  const server = loading ? null : loadedServer.server;
  const error = loading ? null : loadedServer.error ?? joinError;

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color={colors.accent} /></View>;
  }
  if (!server) {
    return (
      <View style={styles.loading}>
        <Text accessibilityRole="alert" style={styles.error}>{error ?? "Server not found."}</Text>
        <Button title="Back to servers" onPress={() => router.replace("/servers")} />
      </View>
    );
  }
  if (!server.isMember) {
    return (
      <View style={styles.joinScreen}>
        <StatusBar style="light" />
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Servers</Text>
        </Pressable>
        <Text style={styles.serverTitle}>{server.name}</Text>
        <Text style={styles.subtitle}>{server.description || `Created by ${server.ownerName}`}</Text>
        <Text style={styles.memberCount}>{server.memberCount} members</Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Button title="Join server" onPress={() => void handleJoin()} />
      </View>
    );
  }

  return (
    <JoinedCommunityServer
      key={server.id}
      server={server}
      session={session}
      onSessionExpired={onSessionExpired}
      onServerLeft={() => router.replace("/servers")}
    />
  );
}

function JoinedCommunityServer({
  server,
  session,
  onSessionExpired,
  onServerLeft,
}: {
  server: CommunityServer;
  session: AuthSession;
  onSessionExpired: () => void;
  onServerLeft: () => void;
}) {
  const { messages, connectionState, connectionError, sendMessage, reconnect } = useChat(
    server.id,
    session.token,
    onSessionExpired,
  );
  const [voiceToken, setVoiceToken] = useState<VoiceToken | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isJoiningVoice, setIsJoiningVoice] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  async function handleJoinVoice() {
    setIsJoiningVoice(true);
    setVoiceError(null);
    try {
      setVoiceToken(await getVoiceToken(session, server.id));
    } catch (requestError) {
      setVoiceError(requestError instanceof Error ? requestError.message : "Could not join voice.");
    } finally {
      setIsJoiningVoice(false);
    }
  }

  async function handleLeaveServer() {
    setIsLeaving(true);
    try {
      await leaveServer(session, server.id);
      onServerLeft();
    } catch (requestError) {
      setVoiceError(requestError instanceof Error ? requestError.message : "Could not leave this server.");
    } finally {
      setIsLeaving(false);
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
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={styles.eyebrow}>COMMUNITY SERVER</Text>
          <Text numberOfLines={1} style={styles.serverTitle}>{server.name}</Text>
        </View>
        {server.ownerId === session.user.id ? (
          <Text style={styles.ownerLabel}>Owner</Text>
        ) : (
          <Pressable accessibilityRole="button" disabled={isLeaving || Boolean(voiceToken)} onPress={() => void handleLeaveServer()} style={styles.leaveServerButton}>
            <Text style={styles.leaveServerText}>{isLeaving ? "Leaving..." : voiceToken ? "Leave voice first" : "Leave"}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.voiceCard}>
        <View style={styles.voiceHeading}>
          <View style={styles.voiceIcon}><Text style={styles.voiceIconText}>♫</Text></View>
          <View style={styles.voiceDetails}>
            <Text style={styles.voiceTitle}>Voice room</Text>
            <Text style={styles.voiceSubtitle}>Join the group call while chatting here</Text>
          </View>
          {!voiceToken ? (
            <Button title="Join" onPress={() => void handleJoinVoice()} loading={isJoiningVoice} />
          ) : null}
        </View>
        {voiceToken ? (
          <VoiceRoom
            serverUrl={voiceToken.livekitUrl}
            token={voiceToken.token}
            onLeave={() => setVoiceToken(null)}
          />
        ) : null}
        {voiceError ? <Text accessibilityRole="alert" style={styles.error}>{voiceError}</Text> : null}
      </View>

      <ConnectionStatus state={connectionState} error={connectionError} onReconnect={reconnect} />
      <MessageList messages={messages} currentUserId={session.user.id} />
      <MessageComposer isConnected={connectionState === "connected"} onSend={sendMessage} />
      <Text style={styles.footnote}>{server.memberCount} members · Text chat is scoped to this server</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  loading: { alignItems: "center", backgroundColor: colors.background, flex: 1, gap: 16, justifyContent: "center", padding: 24 },
  joinScreen: { backgroundColor: colors.background, flex: 1, gap: 14, justifyContent: "center", padding: 28 },
  header: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingTop: Platform.OS === "ios" ? 58 : 26, paddingBottom: 14 },
  backButton: { alignItems: "center", backgroundColor: colors.surfaceRaised, borderRadius: 10, height: 38, justifyContent: "center", width: 38 },
  backText: { color: colors.text, fontSize: 27, lineHeight: 30 },
  headerTitle: { flex: 1, gap: 3 },
  eyebrow: { color: colors.accent, fontSize: 9, fontWeight: "700", letterSpacing: 1.3 },
  serverTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  ownerLabel: { color: colors.accent, fontSize: 11, fontWeight: "700" },
  leaveServerButton: { backgroundColor: colors.surfaceRaised, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8 },
  leaveServerText: { color: colors.text, fontSize: 12, fontWeight: "600" },
  voiceCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 15, borderWidth: 1, gap: 12, marginHorizontal: 14, marginTop: 12, padding: 12 },
  voiceHeading: { alignItems: "center", flexDirection: "row", gap: 10 },
  voiceIcon: { alignItems: "center", backgroundColor: colors.accentDark, borderRadius: 11, height: 38, justifyContent: "center", width: 38 },
  voiceIconText: { color: colors.accent, fontSize: 21, fontWeight: "700" },
  voiceDetails: { flex: 1, gap: 2 },
  voiceTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  voiceSubtitle: { color: colors.muted, fontSize: 11 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  memberCount: { color: colors.accent, fontSize: 12, fontWeight: "600" },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  footnote: { color: colors.muted, fontSize: 10, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, textAlign: "center" },
});
