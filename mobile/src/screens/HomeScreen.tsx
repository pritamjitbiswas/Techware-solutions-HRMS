import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../auth/AuthContext";
import { LocationPermissionDeniedError, useMyPunchesToday, usePunch } from "../lib/useData";
import { colors, radius, spacing } from "../theme";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatElapsed(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function HomeScreen() {
  const { user } = useAuth();
  const { data: punches, isLoading, refetch, isRefetching } = useMyPunchesToday();
  const punchMutation = usePunch();
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const lastPunch = punches?.[punches.length - 1];
  const firstIn = punches?.[0];
  const isClockedIn = lastPunch?.direction_hint === "in";

  const elapsedMs = useMemo(() => {
    if (!isClockedIn || !lastPunch) return 0;
    return Math.max(0, now - new Date(lastPunch.punch_time_utc).getTime());
  }, [isClockedIn, lastPunch, now]);

  const handlePunch = async () => {
    setPermissionError(null);
    try {
      await punchMutation.mutateAsync(isClockedIn ? "out" : "in");
    } catch (err) {
      if (err instanceof LocationPermissionDeniedError) {
        setPermissionError(
          "Location access was denied. Techware HRMS needs your location to record a mobile punch — enable it in your phone's settings and try again.",
        );
      } else {
        setPermissionError(err instanceof Error ? err.message : "Could not record punch");
      }
    }
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <Text style={styles.greeting}>{user?.full_name ?? "Welcome"}</Text>
      <Text style={styles.date}>
        {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
      </Text>

      <Pressable
        style={[styles.punchButton, isClockedIn ? styles.punchButtonOut : styles.punchButtonIn]}
        onPress={handlePunch}
        disabled={punchMutation.isPending || isLoading}
      >
        {punchMutation.isPending ? (
          <ActivityIndicator color={colors.white} size="large" />
        ) : (
          <>
            <Text style={styles.punchButtonLabel}>{isClockedIn ? "CHECK OUT" : "CHECK IN"}</Text>
            {isClockedIn ? <Text style={styles.punchButtonTimer}>{formatElapsed(elapsedMs)}</Text> : null}
          </>
        )}
      </Pressable>

      {permissionError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{permissionError}</Text>
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>First in</Text>
          <Text style={styles.statValue}>{firstIn ? formatTime(firstIn.punch_time_utc) : "—"}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Last punch</Text>
          <Text style={styles.statValue}>{lastPunch ? formatTime(lastPunch.punch_time_utc) : "—"}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Today's punches</Text>
      {isLoading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.lg }} />
      ) : !punches || punches.length === 0 ? (
        <Text style={styles.emptyText}>No punches yet today.</Text>
      ) : (
        <View style={styles.timeline}>
          {punches.map((punch) => (
            <View key={punch.id} style={styles.timelineRow}>
              <View
                style={[
                  styles.timelineDot,
                  { backgroundColor: punch.direction_hint === "in" ? colors.success : colors.danger },
                ]}
              />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTime}>{formatTime(punch.punch_time_utc)}</Text>
                <Text style={styles.timelineDirection}>
                  {punch.direction_hint === "in" ? "Checked in" : "Checked out"}
                </Text>
                {punch.latitude != null ? (
                  <Text style={styles.timelineGeo}>
                    📍 {punch.latitude.toFixed(4)}, {punch.longitude?.toFixed(4)}
                    {punch.geo_flag ? ` · ${punch.geo_flag}` : ""}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },
  container: { padding: spacing.lg, alignItems: "center", paddingBottom: spacing.xxl },
  greeting: { fontSize: 20, fontWeight: "800", color: colors.ink, alignSelf: "flex-start" },
  date: {
    fontSize: 13,
    color: colors.inkLight,
    alignSelf: "flex-start",
    marginBottom: spacing.xl,
  },
  punchButton: {
    width: 200,
    height: 200,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.brand,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  punchButtonIn: { backgroundColor: colors.brand },
  punchButtonOut: { backgroundColor: colors.danger },
  punchButtonLabel: { color: colors.white, fontSize: 20, fontWeight: "800", letterSpacing: 1 },
  punchButtonTimer: { color: colors.white, fontSize: 28, fontWeight: "700", marginTop: spacing.sm },
  errorBox: {
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    width: "100%",
  },
  errorText: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: spacing.md, width: "100%", marginTop: spacing.xl },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: { fontSize: 11, fontWeight: "700", color: colors.inkLight, textTransform: "uppercase" },
  statValue: { fontSize: 18, fontWeight: "800", color: colors.ink, marginTop: spacing.xs },
  sectionTitle: {
    alignSelf: "flex-start",
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  emptyText: { color: colors.inkLight, fontSize: 13 },
  timeline: { width: "100%", gap: spacing.md },
  timelineRow: { flexDirection: "row", gap: spacing.md },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  timelineContent: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timelineTime: { fontSize: 15, fontWeight: "700", color: colors.ink },
  timelineDirection: { fontSize: 12, color: colors.inkLight, marginTop: 2 },
  timelineGeo: { fontSize: 11, color: colors.inkSoft, marginTop: 4 },
});
