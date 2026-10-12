import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../../theme/colors";

interface MessageComposerProps {
  isConnected: boolean;
  onSend: (text: string) => boolean;
}

export function MessageComposer({ isConnected, onSend }: MessageComposerProps) {
  const [draft, setDraft] = useState("");

  function send() {
    if (onSend(draft)) setDraft("");
  }

  return (
    <View style={styles.composer}>
      <TextInput
        accessibilityLabel="Message"
        editable={isConnected}
        multiline
        placeholder={isConnected ? "Write a message..." : "Connect to send a message"}
        placeholderTextColor={colors.muted}
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={send}
        style={styles.input}
        maxLength={2000}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send message"
        disabled={!isConnected || !draft.trim()}
        onPress={send}
        style={({ pressed }) => [
          styles.sendButton,
          (!isConnected || !draft.trim()) && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.sendLabel}>↑</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: { alignItems: "flex-end", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 10, marginHorizontal: 16, padding: 8 },
  input: { color: colors.text, flex: 1, fontSize: 15, maxHeight: 100, minHeight: 40, paddingHorizontal: 8, paddingVertical: 9 },
  sendButton: { alignItems: "center", backgroundColor: colors.accent, borderRadius: 8, height: 40, justifyContent: "center", width: 40 },
  sendLabel: { color: colors.background, fontSize: 24, fontWeight: "700", lineHeight: 27 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
});
