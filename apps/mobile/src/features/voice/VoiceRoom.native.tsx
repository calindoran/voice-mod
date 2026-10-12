import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import {
  AudioSession,
  LiveKitRoom,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
} from "@livekit/react-native";
import { colors } from "../../theme/colors";

interface VoiceRoomProps {
  serverUrl: string;
  token: string;
  onLeave: () => void;
}

export function VoiceRoom({ serverUrl, token, onLeave }: VoiceRoomProps) {
  const [audioReady, setAudioReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void AudioSession.startAudioSession()
      .then(() => {
        if (active) setAudioReady(true);
      })
      .catch((startError: unknown) => {
        if (active) setError(startError instanceof Error ? startError.message : "Could not start audio.");
      });
    return () => {
      active = false;
      void AudioSession.stopAudioSession().catch((stopError: unknown) => {
        console.warn("Could not stop the LiveKit audio session", stopError);
      });
    };
  }, []);

  if (error) return <Text accessibilityRole="alert" style={styles.error}>{error}</Text>;
  if (!audioReady) {
    return <View style={styles.loading}><ActivityIndicator color={colors.accent} /><Text style={styles.status}>Starting audio...</Text></View>;
  }

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={audioReady}
      audio
      video={false}
      onError={(roomError) => setError(roomError.message)}
      onDisconnected={onLeave}
    >
      <NativeRoomControls onLeave={onLeave} onError={setError} />
    </LiveKitRoom>
  );
}

function NativeRoomControls({ onLeave, onError }: { onLeave: () => void; onError: (error: string) => void }) {
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const room = useRoomContext();

  async function toggleMicrophone() {
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not change microphone state.");
    }
  }

  async function leaveRoom() {
    await room.disconnect();
    onLeave();
  }

  return (
    <View style={styles.roomPanel}>
      <Text style={styles.status}>{participants.length} {participants.length === 1 ? "person" : "people"} in voice</Text>
      <View style={styles.participants}>
        {participants.map((participant) => (
          <Text key={participant.identity} style={styles.participant}>{participant.name || participant.identity}</Text>
        ))}
      </View>
      <View style={styles.controls}>
        <Pressable accessibilityRole="button" onPress={() => void toggleMicrophone()} style={styles.controlButton}>
          <Text style={styles.controlText}>{isMicrophoneEnabled ? "Mute mic" : "Unmute mic"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => void leaveRoom()} style={[styles.controlButton, styles.leaveButton]}>
          <Text style={styles.leaveText}>Leave voice</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  roomPanel: { backgroundColor: colors.accentDark, borderRadius: 14, gap: 12, padding: 14 },
  loading: { alignItems: "center", flexDirection: "row", gap: 9, paddingVertical: 8 },
  status: { color: colors.text, fontSize: 13, fontWeight: "600" },
  participants: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  participant: { backgroundColor: colors.surfaceRaised, borderRadius: 9, color: colors.text, fontSize: 12, paddingHorizontal: 9, paddingVertical: 6 },
  controls: { flexDirection: "row", gap: 8 },
  controlButton: { backgroundColor: colors.surfaceRaised, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  controlText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  leaveButton: { backgroundColor: colors.danger },
  leaveText: { color: colors.background, fontSize: 12, fontWeight: "700" },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
});
