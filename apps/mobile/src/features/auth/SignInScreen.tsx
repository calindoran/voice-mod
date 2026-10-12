import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { BrandMark } from "../../components/BrandMark";
import { useSession } from "./session";
import { Button } from "../../ui/Button";
import { TextField } from "../../ui/TextField";
import { colors } from "../../theme/colors";

export function SignInScreen() {
  const { signIn } = useSession();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userName, setUserName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function submit() {
    setIsSigningIn(true);
    setError(null);
    try {
      await signIn(phoneNumber.trim(), userName.trim());
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign-in failed. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BrandMark />
        <Text style={styles.eyebrow}>VOICE MOD · PRIVATE CHAT</Text>
        <Text style={styles.title}>Your people, in one place.</Text>
        <Text style={styles.subtitle}>
          Sign in with the phone number and username you were given access to.
        </Text>

        <View style={styles.form}>
          <TextField
            label="PHONE NUMBER"
            autoComplete="tel"
            autoCapitalize="none"
            keyboardType="phone-pad"
            placeholder="4155550123"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            returnKeyType="next"
          />
          <TextField
            label="USERNAME"
            autoComplete="username"
            autoCapitalize="words"
            placeholder="Your username"
            value={userName}
            onChangeText={setUserName}
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
          />
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <View style={styles.submit}>
            <Button
              title="Continue securely"
              onPress={() => void submit()}
              loading={isSigningIn}
              disabled={!phoneNumber.trim() || !userName.trim()}
            />
          </View>
          <Text style={styles.footnote}>Access is limited to approved members.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { alignSelf: "center", flexGrow: 1, justifyContent: "center", maxWidth: 480, paddingHorizontal: 28, paddingVertical: 40, width: "100%" },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: "700", letterSpacing: 1.6 },
  title: { color: colors.text, fontSize: 36, fontWeight: "700", letterSpacing: -1.2, lineHeight: 42, marginTop: 14 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 23, marginTop: 12, maxWidth: 340 },
  form: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, marginTop: 30, padding: 18 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginTop: 14 },
  submit: { marginTop: 24 },
  footnote: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 14 },
});
