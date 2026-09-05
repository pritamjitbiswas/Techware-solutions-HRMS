import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../lib/api";
import { colors, radius, spacing } from "../theme";

export function ChangePasswordScreen() {
  const { changePassword, logout } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(current, next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Set a new password</Text>
        <Text style={styles.subtitle}>You must change your temporary password before continuing.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Current password</Text>
          <TextInput style={styles.input} secureTextEntry value={current} onChangeText={setCurrent} />

          <Text style={styles.label}>New password</Text>
          <TextInput style={styles.input} secureTextEntry value={next} onChangeText={setNext} />

          <Text style={styles.label}>Confirm new password</Text>
          <TextInput style={styles.input} secureTextEntry value={confirm} onChangeText={setConfirm} />

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Update password</Text>}
          </Pressable>

          <Pressable style={styles.ghostButton} onPress={() => logout()}>
            <Text style={styles.ghostButtonText}>Sign out instead</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },
  container: { flexGrow: 1, justifyContent: "center", padding: spacing.xl },
  title: { textAlign: "center", fontSize: 22, fontWeight: "800", color: colors.ink },
  subtitle: { textAlign: "center", marginTop: spacing.xs, marginBottom: spacing.xl, color: colors.inkLight, fontSize: 13 },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md },
  label: { fontSize: 12, fontWeight: "700", color: colors.inkLight, textTransform: "uppercase", marginBottom: -spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.ink,
  },
  errorBox: { backgroundColor: colors.dangerLight, borderRadius: radius.md, padding: spacing.md },
  errorText: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  button: { backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center" },
  buttonText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  ghostButton: { alignItems: "center", paddingVertical: spacing.sm },
  ghostButtonText: { color: colors.inkLight, fontWeight: "600", fontSize: 13 },
});
