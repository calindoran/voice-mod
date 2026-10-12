import { useEffect, useRef, useState } from "react";
import { ConnectionState, Room, RoomEvent, Track } from "livekit-client";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";

interface VoiceRoomProps {
  serverUrl: string;
  token: string;
  onLeave: () => void;
}

export function VoiceRoom({ serverUrl, token, onLeave }: VoiceRoomProps) {
  const roomRef = useRef<Room | null>(null);
  const [connection, setConnection] = useState("connecting");
  const [participants, setParticipants] = useState<string[]>([]);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const room = new Room({ adaptiveStream: true, dynacast: true });
    const attachedAudio = new Set<HTMLMediaElement>();
    roomRef.current = room;

    function updateRoomState() {
      setConnection(room.state);
      setMicrophoneEnabled(room.localParticipant.isMicrophoneEnabled);
      setParticipants([
        room.localParticipant.name || room.localParticipant.identity,
        ...Array.from(room.remoteParticipants.values(), (participant) =>
          participant.name || participant.identity,
        ),
      ]);
    }

    function attachAudio(track: Track) {
      if (track.kind !== Track.Kind.Audio) return;
      const element = track.attach();
      element.autoplay = true;
      element.setAttribute("playsinline", "true");
      element.style.display = "none";
      document.body.appendChild(element);
      attachedAudio.add(element);
      void element.play().catch(() => {
        setError("Your browser blocked audio playback. Interact with the page and try again.");
      });
    }

    function detachAudio(track: Track) {
      for (const element of track.detach()) {
        attachedAudio.delete(element);
        element.remove();
      }
    }

    room
      .on(RoomEvent.ConnectionStateChanged, updateRoomState)
      .on(RoomEvent.ParticipantConnected, updateRoomState)
      .on(RoomEvent.ParticipantDisconnected, updateRoomState)
      .on(RoomEvent.LocalTrackPublished, updateRoomState)
      .on(RoomEvent.LocalTrackUnpublished, updateRoomState)
      .on(RoomEvent.TrackSubscribed, attachAudio)
      .on(RoomEvent.TrackUnsubscribed, detachAudio);

    void room
      .connect(serverUrl, token)
      .then(async () => {
        await room.localParticipant.setMicrophoneEnabled(true);
        updateRoomState();
      })
      .catch((connectError: unknown) => {
        setError(connectError instanceof Error ? connectError.message : "Could not connect to voice.");
        setConnection("disconnected");
      });

    return () => {
      room.removeAllListeners();
      for (const element of attachedAudio) element.remove();
      attachedAudio.clear();
      if (roomRef.current === room) roomRef.current = null;
      void room.disconnect().catch((disconnectError: unknown) => {
        console.warn("Could not disconnect from the LiveKit room", disconnectError);
      });
    };
  }, [serverUrl, token]);

  async function toggleMicrophone() {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled);
      setMicrophoneEnabled(room.localParticipant.isMicrophoneEnabled);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Could not change microphone state.");
    }
  }

  async function leaveRoom() {
    await roomRef.current?.disconnect();
    onLeave();
  }

  return (
    <View style={styles.roomPanel}>
      <Text style={styles.status}>
        {connection === ConnectionState.Connected ? "Connected" : connection === "connecting" ? "Connecting..." : "Disconnected"}
      </Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <View style={styles.participants}>
        {participants.map((name) => <Text key={name} style={styles.participant}>{name}</Text>)}
      </View>
      <View style={styles.controls}>
        <Pressable accessibilityRole="button" disabled={connection !== ConnectionState.Connected} onPress={() => void toggleMicrophone()} style={styles.controlButton}>
          <Text style={styles.controlText}>{microphoneEnabled ? "Mute mic" : "Unmute mic"}</Text>
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
