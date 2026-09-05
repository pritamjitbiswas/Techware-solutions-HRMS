import { useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useMyAttendance } from "../lib/useData";
import type { AttendanceDay } from "../lib/types";
import { colors, radius, spacing, statusMeta } from "../theme";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function AttendanceScreen() {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<AttendanceDay | null>(null);

  const { data: days, isLoading } = useMyAttendance(year, month);

  const grid = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const byDate = new Map((days ?? []).map((d) => [d.work_date, d]));
    const cells: (AttendanceDay | null)[] = Array(startOffset).fill(null);
    for (let d = 1; d <= daysInMonth; d += 1) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push(byDate.get(iso) ?? null);
    }
    return cells;
  }, [days, year, month]);

  const moveMonth = (delta: number) => {
    const nextMonth = (month + delta + 12) % 12;
    setYear(month + delta < 0 ? year - 1 : month + delta > 11 ? year + 1 : year);
    setMonth(nextMonth);
  };

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Pressable onPress={() => moveMonth(-1)} style={styles.navButton}>
          <Text style={styles.navButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          {MONTHS[month]} {year}
        </Text>
        <Pressable onPress={() => moveMonth(1)} style={styles.navButton}>
          <Text style={styles.navButtonText}>›</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView contentContainerStyle={styles.calendarWrap}>
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.weekdayLabel}>
                {day}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {grid.map((cell, index) => {
              if (!cell) return <View key={`empty-${index}`} style={styles.cell} />;
              const meta = statusMeta[cell.status] ?? statusMeta.pending;
              return (
                <Pressable
                  key={cell.id}
                  style={[styles.cell, styles.dayCell, { backgroundColor: meta.bg }]}
                  onPress={() => setSelected(cell)}
                >
                  <Text style={[styles.dayNumber, { color: meta.fg }]}>
                    {Number(cell.work_date.slice(8, 10))}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.legend}>
            {Object.entries(statusMeta).map(([key, meta]) => (
              <View key={key} style={[styles.legendChip, { backgroundColor: meta.bg }]}>
                <Text style={[styles.legendText, { color: meta.fg }]}>{meta.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <Modal visible={selected !== null} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelected(null)} />
        <View style={styles.modalCard}>
          {selected ? (
            <>
              <Text style={styles.modalTitle}>{selected.work_date}</Text>
              <View style={[styles.statusPill, { backgroundColor: statusMeta[selected.status]?.bg }]}>
                <Text style={{ color: statusMeta[selected.status]?.fg, fontWeight: "700" }}>
                  {statusMeta[selected.status]?.label}
                </Text>
              </View>
              <View style={styles.detailGrid}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>First in</Text>
                  <Text style={styles.detailValue}>{formatTime(selected.first_in_utc)}</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Last out</Text>
                  <Text style={styles.detailValue}>{formatTime(selected.last_out_utc)}</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Worked</Text>
                  <Text style={styles.detailValue}>{formatMinutes(selected.worked_minutes)}</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Overtime</Text>
                  <Text style={styles.detailValue}>{formatMinutes(selected.overtime_minutes)}</Text>
                </View>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setSelected(null)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonText: { fontSize: 20, color: colors.ink, fontWeight: "700" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: colors.ink, minWidth: 140, textAlign: "center" },
  calendarWrap: { padding: spacing.lg, paddingBottom: spacing.xxl },
  weekdayRow: { flexDirection: "row" },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkLight,
    marginBottom: spacing.sm,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "14.28%", aspectRatio: 1, padding: 3 },
  dayCell: { borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  dayNumber: { fontSize: 14, fontWeight: "700" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
  legendChip: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  legendText: { fontSize: 11, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(26,31,54,0.5)" },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.ink, marginBottom: spacing.md },
  statusPill: { alignSelf: "flex-start", paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, marginBottom: spacing.lg },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  detailCard: {
    width: "47%",
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  detailLabel: { fontSize: 11, fontWeight: "700", color: colors.inkLight, textTransform: "uppercase" },
  detailValue: { fontSize: 16, fontWeight: "800", color: colors.ink, marginTop: spacing.xs },
  closeButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  closeButtonText: { fontWeight: "700", color: colors.ink },
});
