import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiError } from "../lib/api";
import { useApplyLeave, useLeaveBalance, useLeaveRequests, useLeaveTypes } from "../lib/useData";
import type { LeaveType } from "../lib/types";
import { colors, radius, spacing } from "../theme";

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: colors.accentLight, fg: "#C77F1A" },
  approved: { bg: colors.successLight, fg: colors.success },
  rejected: { bg: colors.dangerLight, fg: colors.danger },
  cancelled: { bg: colors.paper, fg: colors.inkLight },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function LeaveScreen() {
  const { data: balances, isLoading: balancesLoading } = useLeaveBalance();
  const { data: requests, isLoading: requestsLoading } = useLeaveRequests();
  const { data: leaveTypes } = useLeaveTypes();
  const applyMutation = useApplyLeave();

  const [applyOpen, setApplyOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<LeaveType | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setSelectedType(null);
    setFromDate("");
    setToDate("");
    setReason("");
    setFormError(null);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!selectedType || !fromDate || !toDate || !reason.trim()) {
      setFormError("Fill in every field, including a leave type.");
      return;
    }
    try {
      await applyMutation.mutateAsync({
        leave_type_id: selectedType.id,
        from_date: fromDate,
        to_date: toDate,
        is_half_day: false,
        reason,
      });
      setApplyOpen(false);
      resetForm();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not submit request");
    }
  };

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Leave</Text>
          <Pressable style={styles.applyButton} onPress={() => setApplyOpen(true)}>
            <Text style={styles.applyButtonText}>+ Apply</Text>
          </Pressable>
        </View>

        {balancesLoading ? (
          <ActivityIndicator color={colors.brand} />
        ) : (
          <View style={styles.balanceGrid}>
            {(balances ?? []).map((balance) => (
              <View key={balance.id} style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>{balance.leave_type?.name}</Text>
                <Text style={styles.balanceValue}>{balance.closing}</Text>
                <Text style={styles.balanceSub}>days available</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Requests</Text>
        {requestsLoading ? (
          <ActivityIndicator color={colors.brand} />
        ) : !requests || requests.length === 0 ? (
          <Text style={styles.emptyText}>No leave requests yet.</Text>
        ) : (
          <View style={{ gap: spacing.md }}>
            {requests.map((request) => {
              const statusStyle = STATUS_COLORS[request.status] ?? STATUS_COLORS.pending;
              return (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <Text style={styles.requestType}>{request.leave_type?.name ?? "Leave"}</Text>
                    <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.statusPillText, { color: statusStyle.fg }]}>
                        {request.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.requestDates}>
                    {formatDate(request.from_date)} → {formatDate(request.to_date)} · {request.total_days}{" "}
                    day{Number(request.total_days) > 1 ? "s" : ""}
                  </Text>
                  <Text style={styles.requestReason}>{request.reason}</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={applyOpen} transparent animationType="slide" onRequestClose={() => setApplyOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setApplyOpen(false)} />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Apply for leave</Text>

          <Text style={styles.label}>Leave type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
            {(leaveTypes ?? []).map((type) => (
              <Pressable
                key={type.id}
                style={[
                  styles.typeChip,
                  selectedType?.id === type.id && styles.typeChipSelected,
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    selectedType?.id === type.id && styles.typeChipTextSelected,
                  ]}
                >
                  {type.code}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.label}>From (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} placeholder="2026-09-01" value={fromDate} onChangeText={setFromDate} />

          <Text style={styles.label}>To (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} placeholder="2026-09-02" value={toDate} onChangeText={setToDate} />

          <Text style={styles.label}>Reason</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell your manager why you need this leave"
            value={reason}
            onChangeText={setReason}
            multiline
          />

          {formError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}

          <View style={styles.modalActions}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                setApplyOpen(false);
                resetForm();
              }}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={applyMutation.isPending}>
              {applyMutation.isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Submit</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink },
  applyButton: { backgroundColor: colors.brand, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  applyButtonText: { color: colors.white, fontWeight: "700" },
  balanceGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  balanceCard: {
    width: "47%",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceLabel: { fontSize: 11, fontWeight: "700", color: colors.inkLight, textTransform: "uppercase" },
  balanceValue: { fontSize: 28, fontWeight: "800", color: colors.ink, marginTop: spacing.xs },
  balanceSub: { fontSize: 11, color: colors.inkSoft },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.ink, marginTop: spacing.xl, marginBottom: spacing.md },
  emptyText: { color: colors.inkLight, fontSize: 13 },
  requestCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  requestType: { fontSize: 15, fontWeight: "700", color: colors.ink },
  statusPill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  statusPillText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  requestDates: { fontSize: 12, color: colors.inkLight, marginTop: spacing.xs },
  requestReason: { fontSize: 12, color: colors.inkSoft, marginTop: spacing.xs },
  modalOverlay: { flex: 1, backgroundColor: "rgba(26,31,54,0.5)" },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.ink, marginBottom: spacing.lg },
  label: { fontSize: 12, fontWeight: "700", color: colors.inkLight, textTransform: "uppercase", marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  typeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  typeChipSelected: { backgroundColor: colors.brand, borderColor: colors.brand },
  typeChipText: { fontWeight: "700", color: colors.ink, fontSize: 12 },
  typeChipTextSelected: { color: colors.white },
  errorBox: { backgroundColor: colors.dangerLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorText: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  modalActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  secondaryButton: { flex: 1, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center", backgroundColor: colors.paper },
  secondaryButtonText: { fontWeight: "700", color: colors.ink },
  primaryButton: { flex: 1, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center", backgroundColor: colors.brand },
  primaryButtonText: { fontWeight: "700", color: colors.white },
});
