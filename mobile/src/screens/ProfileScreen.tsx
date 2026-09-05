import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth/AuthContext";
import { ApiError, api, endpoints } from "../lib/api";
import type { Employee } from "../lib/types";
import { colors, radius, spacing } from "../theme";

type SelfFields = {
  personal_mobile: string;
  personal_email: string;
  current_address: string;
  emergency_contact_name: string;
  emergency_contact_number: string;
  blood_group: string;
};

const FIELD_LABELS: Record<keyof SelfFields, string> = {
  personal_mobile: "Personal mobile",
  personal_email: "Personal email",
  current_address: "Current address",
  emergency_contact_name: "Emergency contact name",
  emergency_contact_number: "Emergency contact number",
  blood_group: "Blood group",
};

export function ProfileScreen() {
  const { user, role, logout } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SelfFields>({
    personal_mobile: "",
    personal_email: "",
    current_address: "",
    emergency_contact_name: "",
    emergency_contact_number: "",
    blood_group: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      personal_mobile: user.personal_mobile ?? "",
      personal_email: user.personal_email ?? "",
      current_address: user.current_address ?? "",
      emergency_contact_name: user.emergency_contact_name ?? "",
      emergency_contact_number: user.emergency_contact_number ?? "",
      blood_group: user.blood_group ?? "",
    });
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<SelfFields>) => api.patch<Employee>(endpoints.me.root, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => {
      Alert.alert("Could not save", err instanceof ApiError ? err.message : "Something went wrong");
    },
  });

  if (!user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  const initials = user.full_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user.full_name}</Text>
        <Text style={styles.role}>
          {role} · {user.employee_code}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Employment</Text>
        <InfoRow label="Official email" value={user.official_email} />
        <InfoRow label="Date of joining" value={user.date_of_joining} />
        <InfoRow label="Work location" value={user.work_location} />
        <InfoRow label="Employment status" value={user.employment_status} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal details</Text>
        {(Object.keys(FIELD_LABELS) as (keyof SelfFields)[]).map((field) => (
          <View key={field} style={{ marginBottom: spacing.md }}>
            <Text style={styles.label}>{FIELD_LABELS[field]}</Text>
            <TextInput
              style={styles.input}
              value={form[field]}
              onChangeText={(value) => setForm({ ...form, [field]: value })}
            />
          </View>
        ))}

        {saved ? <Text style={styles.savedText}>Saved.</Text> : null}

        <Pressable
          style={styles.saveButton}
          onPress={() => updateMutation.mutate(form)}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save changes</Text>
          )}
        </Pressable>
      </View>

      <Pressable style={styles.signOutButton} onPress={() => logout()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value ?? "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  headerCard: { alignItems: "center", paddingVertical: spacing.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarText: { color: colors.white, fontSize: 24, fontWeight: "800" },
  name: { fontSize: 18, fontWeight: "800", color: colors.ink },
  role: { fontSize: 13, color: colors.inkLight, marginTop: 2 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 14, fontWeight: "800", color: colors.ink, marginBottom: spacing.md },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: 13, color: colors.inkLight },
  infoValue: { fontSize: 13, color: colors.ink, fontWeight: "600" },
  label: { fontSize: 11, fontWeight: "700", color: colors.inkLight, textTransform: "uppercase", marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.ink,
  },
  savedText: { color: colors.success, fontSize: 12, fontWeight: "700", marginBottom: spacing.sm },
  saveButton: { backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center" },
  saveButtonText: { color: colors.white, fontWeight: "700" },
  signOutButton: {
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  signOutText: { color: colors.danger, fontWeight: "700" },
});
