import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Button } from "../../ui/Button";
import { colors } from "../../theme/colors";
import { AuthSession } from "../auth/types";
import { createServer, getServers, joinServer } from "./api";
import { CommunityServer } from "./types";

interface ServerDirectoryScreenProps {
  session: AuthSession;
  onSignOut: () => Promise<void>;
}

export function ServerDirectoryScreen({ session, onSignOut }: ServerDirectoryScreenProps) {
  const [loadedServers, setLoadedServers] = useState<{
    token: string;
    servers: CommunityServer[];
    error: string | null;
  } | null>(null);
  const [serverName, setServerName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [workingServerId, setWorkingServerId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    let active = true;
    void getServers(session)
      .then((result) => {
        if (active) setLoadedServers({ token: session.token, servers: result, error: null });
      })
      .catch((requestError: unknown) => {
        if (active) {
          setLoadedServers({
            token: session.token,
            servers: [],
            error: requestError instanceof Error ? requestError.message : "Could not load servers.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [session]);

  const loading = loadedServers?.token !== session.token;
  const servers = loading ? [] : loadedServers.servers;
  const loadError = loading ? null : loadedServers.error;

  async function handleSignOut() {
    try {
      await onSignOut();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Could not sign out.");
    }
  }

  async function handleCreateServer() {
    if (!serverName.trim()) return;
    setIsCreating(true);
    setError(null);
    try {
      const server = await createServer(session, serverName.trim(), description.trim());
      setLoadedServers((current) => ({
        token: session.token,
        servers: [server, ...(current?.token === session.token ? current.servers : [])],
        error: null,
      }));
      setServerName("");
      setDescription("");
      openServer(server.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create server.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleJoin(server: CommunityServer) {
    setWorkingServerId(server.id);
    setError(null);
    try {
      const joined = await joinServer(session, server.id);
      setLoadedServers((current) => ({
        token: session.token,
        servers: (current?.token === session.token ? current.servers : []).map((item) =>
          item.id === joined.id ? joined : item,
        ),
        error: null,
      }));
      openServer(joined.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not join server.");
    } finally {
      setWorkingServerId(null);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>VOICE MOD</Text>
          <Text style={styles.title}>Your servers</Text>
          <Text style={styles.subtitle}>Signed in as {session.user.userName}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => void handleSignOut()} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Sign out</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.createCard}>
          <Text style={styles.sectionTitle}>Create a server</Text>
          <Text style={styles.helpText}>Start a community with its own text chat and group voice room.</Text>
          <TextInput
            accessibilityLabel="Server name"
            maxLength={50}
            onChangeText={setServerName}
            placeholder="Server name"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={serverName}
          />
          <TextInput
            accessibilityLabel="Server description"
            maxLength={240}
            onChangeText={setDescription}
            placeholder="Description (optional)"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={description}
          />
          <Button
            title="Create server"
            onPress={() => void handleCreateServer()}
            loading={isCreating}
            disabled={!serverName.trim()}
          />
        </View>

        <View style={styles.listHeading}>
          <Text style={styles.sectionTitle}>Discover servers</Text>
          {loading ? <ActivityIndicator color={colors.accent} /> : null}
        </View>
        {error || loadError ? <Text accessibilityRole="alert" style={styles.error}>{error ?? loadError}</Text> : null}
        {!loading && servers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No servers yet</Text>
            <Text style={styles.helpText}>Create the first one and invite your approved users to join.</Text>
          </View>
        ) : null}
        {servers.map((server) => {
          const isWorking = workingServerId === server.id;
          return (
            <View key={server.id} style={styles.serverCard}>
              <View style={styles.serverDetails}>
                <Text style={styles.serverName}>{server.name}</Text>
                <Text style={styles.serverDescription}>
                  {server.description || `Created by ${server.ownerName}`}
                </Text>
                <Text style={styles.memberCount}>
                  {server.memberCount} {server.memberCount === 1 ? "member" : "members"}
                  {server.ownerId === session.user.id ? " · You own this server" : ""}
                </Text>
              </View>
              <Button
                title={isWorking ? "Joining..." : server.isMember ? "Open" : "Join"}
                onPress={() => server.isMember ? openServer(server.id) : void handleJoin(server)}
                loading={isWorking}
              />
            </View>
          );
        })}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function openServer(serverId: string) {
  router.push({ pathname: "/server/[serverId]", params: { serverId } });
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
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: "700", letterSpacing: 1.6 },
  title: { color: colors.text, fontSize: 25, fontWeight: "700", marginTop: 3 },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  headerButton: { backgroundColor: colors.surfaceRaised, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  headerButtonText: { color: colors.text, fontSize: 12, fontWeight: "600" },
  content: { alignSelf: "center", gap: 14, maxWidth: 760, padding: 18, paddingBottom: 36, width: "100%" },
  createCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, gap: 12, padding: 16 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "700" },
  helpText: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 8, borderWidth: 1, color: colors.text, fontSize: 15, paddingHorizontal: 13, paddingVertical: 12 },
  listHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
  emptyCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, padding: 18 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "600", marginBottom: 5 },
  serverCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 12, justifyContent: "space-between", padding: 14 },
  serverDetails: { flex: 1, gap: 4 },
  serverName: { color: colors.text, fontSize: 16, fontWeight: "700" },
  serverDescription: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  memberCount: { color: colors.accent, fontSize: 11, fontWeight: "600", marginTop: 3 },
});
