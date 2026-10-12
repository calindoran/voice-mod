import { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { ChatMessage } from "./types";

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
    >
      {messages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.icon}>✳</Text>
          <Text style={styles.emptyTitle}>A fresh conversation</Text>
          <Text style={styles.emptyText}>Your messages will appear here for everyone in the room.</Text>
        </View>
      ) : (
        messages.map((message) => {
          const isOwnMessage = message.senderId === currentUserId;
          return (
            <View key={message.id} style={[styles.row, isOwnMessage && styles.ownRow]}>
              <View style={[styles.bubble, isOwnMessage && styles.ownBubble]}>
                {!isOwnMessage ? <Text style={styles.sender}>{message.sender}</Text> : null}
                <Text style={styles.message}>{message.text}</Text>
                <Text style={[styles.time, isOwnMessage && styles.ownTime]}>
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, justifyContent: "flex-end", paddingHorizontal: 18, paddingVertical: 16 },
  empty: { alignItems: "center", paddingHorizontal: 30, paddingVertical: 42 },
  icon: { color: colors.accent, fontSize: 28, marginBottom: 12 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "600" },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 8, textAlign: "center" },
  row: { alignItems: "flex-start", marginVertical: 5 },
  ownRow: { alignItems: "flex-end" },
  bubble: { backgroundColor: colors.surface, borderRadius: 16, maxWidth: "84%", paddingHorizontal: 14, paddingVertical: 10 },
  ownBubble: { backgroundColor: colors.accentDark },
  sender: { color: colors.accent, fontSize: 11, fontWeight: "700", marginBottom: 4 },
  message: { color: colors.text, fontSize: 15, lineHeight: 21 },
  time: { color: colors.muted, fontSize: 10, marginTop: 5, textAlign: "right" },
  ownTime: { color: "#B6D6C8" },
});
