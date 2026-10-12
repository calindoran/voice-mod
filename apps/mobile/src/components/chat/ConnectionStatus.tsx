import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { ConnectionState } from "../../features/chat/types";

interface ConnectionStatusProps {
  state: ConnectionState;
  error: string | null;
  onReconnect: () => void;
}

export function ConnectionStatus({ state, error, onReconnect }: ConnectionStatusProps) {
  const label = { connecting: "Connecting", connected: "Live", disconnected: "Offline" }[state];

  return (
    <View>
      <View style={styles.row}>
        <View style={[styles.dot, state === "connected" && styles.live]} />
        <Text style={styles.label}>{label}</Text>
        {state === "disconnected" ? (
          <Pressable accessibilityRole="button" onPress={onReconnect}>
            <Text style={styles.reconnect}>Reconnect</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: 8, paddingHorizontal: 22, paddingVertical: 12 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.muted },
  live: { backgroundColor: colors.accent },
  label: { color: colors.muted, fontSize: 12 },
  reconnect: { color: colors.accent, fontSize: 12, fontWeight: "600", marginLeft: 8 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 17, paddingHorizontal: 22, paddingBottom: 8 },
});
