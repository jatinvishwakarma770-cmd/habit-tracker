import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { useAuth } from "@/context/AuthContext";

const API_URL = "https://habit-tracker-n3gw.onrender.com";

type Habit = {
  habitId: string;
  title: string;
  category: string;
  frequency: string;
  todayStatus?: { key: string; label?: string };
  metrics?: {
    totalRecorded?: number;
    completedCount?: number;
    missedCount?: number;
    completionRate?: number | null;
    completionRatePercent?: number | null;
    currentStreak?: number;
    recent?: {
      completedDays?: number;
      missedDays?: number;
      completionRate?: number | null;
    };
  };
  feedback?: {
    status?: string;
    headline?: string;
    message?: string;
    action?: string;
    motivation?: string;
    tips?: string[];
  };
};

type Analysis = {
  generatedAt: string;
  habitCount: number;
  summary: {
    completed: number;
    missed: number;
    pending: number;
    notScheduled: number;
  };
  habits: Habit[];
};

const COLORS = {
  background: "#0C100E",
  surface: "#141A16",
  surfaceRaised: "#1A231D",
  border: "#29362D",
  text: "#F0F5F0",
  muted: "#9AA89D",
  green: "#9BDBA8",
  greenDark: "#203B29",
  red: "#F08D88",
  redDark: "#3A2424",
  amber: "#F0CC79",
  amberDark: "#392F1C",
  blue: "#9DC9F5",
};

function statusLabel(status?: string) {
  switch (status) {
    case "completed": return "Completed today";
    case "missed": return "Missed today";
    case "pending": return "Still to do";
    case "not_scheduled": return "Rest day";
    default: return status || "Unknown status";
  }
}

function statusColor(status?: string) {
  switch (status) {
    case "completed": return COLORS.green;
    case "missed": return COLORS.red;
    case "pending": return COLORS.amber;
    default: return COLORS.muted;
  }
}

function feedbackColor(status?: string) {
  const normalized = (status || "").toLowerCase();
  if (normalized.includes("attention") || normalized.includes("risk") || normalized.includes("miss")) return COLORS.red;
  if (normalized.includes("good") || normalized.includes("success") || normalized.includes("strong")) return COLORS.green;
  return COLORS.blue;
}

function safePercent(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

export default function DailyAnalysisScreen() {
  const { token } = useAuth();
  const [data, setData] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalysis = useCallback(async () => {
    if (!token) {
      setError("You are not logged in. Please log in again.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setError("");
    try {
      const response = await fetch(`${API_URL}/api/daily-analysis`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const result = await response.json();
      console.log("Daily analysis HTTP status:", response.status);

      if (!response.ok || result?.success === false) {
        throw new Error(result?.message || `Server error: ${response.status}`);
      }

      // Supports both the current backend response and the older { data: ... } shape.
      const payload = result?.data ?? result;
      if (!Array.isArray(payload?.habits) || !payload?.summary) {
        throw new Error(result?.message || "Unexpected response from the analysis API.");
      }
      setData(payload as Analysis);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not load habit analysis.";
      console.error("Daily analysis failed:", message);
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadAnalysis();
    }, [loadAnalysis])
  );

  const refresh = () => {
    setRefreshing(true);
    loadAnalysis();
  };

  const summary = data?.summary;
  const totalToday = summary
    ? summary.completed + summary.missed + summary.pending
    : 0;
  const progress = totalToday > 0 ? Math.round((summary!.completed / totalToday) * 100) : 0;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.green} />
        }
      >
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <Text style={styles.backText}>‹  Back</Text>
        </Pressable>

        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>YOUR PERSONAL COACH</Text>
            <Text style={styles.title}>Daily insights</Text>
            <Text style={styles.subtitle}>Small steps today. Stronger habits tomorrow.</Text>
          </View>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>✦</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={COLORS.green} size="large" />
            <Text style={styles.stateTitle}>Preparing your insights</Text>
            <Text style={styles.muted}>Reviewing your recorded habit history…</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <View style={[styles.stateIcon, { backgroundColor: COLORS.redDark }]}><Text style={styles.stateIconText}>!</Text></View>
            <Text style={styles.stateTitle}>Insights are unavailable</Text>
            <Text style={styles.muted}>{error}</Text>
            <Pressable style={styles.primaryButton} onPress={refresh}>
              <Text style={styles.primaryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.heroLabel}>TODAY'S CONSISTENCY</Text>
                  <Text style={styles.heroPercent}>{progress}<Text style={styles.heroPercentSign}>%</Text></Text>
                </View>
                <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>✦  DAILY CHECK-IN</Text></View>
              </View>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
              <Text style={styles.heroHint}>
                {totalToday === 0
                  ? "No scheduled habits to measure today. Keep building your routine."
                  : `${summary?.completed ?? 0} of ${totalToday} scheduled habits completed today.`}
              </Text>
              <View style={styles.heroDivider} />
              <View style={styles.heroStats}>
                <View style={styles.heroStat}><Text style={styles.heroStatValue}>{data?.habitCount ?? 0}</Text><Text style={styles.heroStatLabel}>Active habits</Text></View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}><Text style={[styles.heroStatValue, { color: COLORS.green }]}>{summary?.completed ?? 0}</Text><Text style={styles.heroStatLabel}>Completed</Text></View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}><Text style={[styles.heroStatValue, { color: COLORS.amber }]}>{summary?.pending ?? 0}</Text><Text style={styles.heroStatLabel}>Still to do</Text></View>
              </View>
            </View>

            <View style={styles.sectionHeadingRow}>
              <View><Text style={styles.sectionTitle}>Today's overview</Text><Text style={styles.sectionSubtitle}>A quick look at your routine</Text></View>
            </View>
            <View style={styles.summaryGrid}>
              <SummaryCard label="Completed" value={summary?.completed ?? 0} color={COLORS.green} icon="✓" />
              <SummaryCard label="Missed" value={summary?.missed ?? 0} color={COLORS.red} icon="×" />
              <SummaryCard label="Pending" value={summary?.pending ?? 0} color={COLORS.amber} icon="◷" />
              <SummaryCard label="Rest day" value={summary?.notScheduled ?? 0} color={COLORS.muted} icon="—" />
            </View>

            <View style={styles.sectionHeadingRow}>
              <View><Text style={styles.sectionTitle}>Your habit coach</Text><Text style={styles.sectionSubtitle}>Personal feedback based on your history</Text></View>
              <View style={styles.countBadge}><Text style={styles.countBadgeText}>{data?.habits.length ?? 0}</Text></View>
            </View>

            {data?.habits.length === 0 ? (
              <View style={styles.stateCard}>
                <View style={styles.stateIcon}><Text style={styles.stateIconText}>＋</Text></View>
                <Text style={styles.stateTitle}>Your journey starts here</Text>
                <Text style={styles.muted}>Add a habit to start receiving progress insights and coaching tips.</Text>
                <Pressable style={styles.primaryButton} onPress={() => router.push("/add-habit" as never)}>
                  <Text style={styles.primaryButtonText}>Create a habit</Text>
                </Pressable>
              </View>
            ) : null}

            {data?.habits.map((habit, index) => {
              const completion = safePercent(habit.metrics?.completionRatePercent);
              const coachColor = feedbackColor(habit.feedback?.status);
              const todayColor = statusColor(habit.todayStatus?.key);
              return (
                <View key={habit.habitId || `${habit.title}-${index}`} style={styles.habitCard}>
                  <View style={styles.habitTopRow}>
                    <View style={styles.habitSymbol}><Text style={styles.habitSymbolText}>{(habit.title || "H").trim().charAt(0).toUpperCase()}</Text></View>
                    <View style={styles.habitTitleWrap}>
                      <Text style={styles.habitCategory}>{habit.category || "Other"}  ·  {habit.frequency || "Daily"}</Text>
                      <Text style={styles.habitTitle}>{habit.title || "Untitled habit"}</Text>
                    </View>
                    <View style={[styles.statusDot, { backgroundColor: todayColor }]} />
                  </View>

                  <View style={styles.todayStatusRow}>
                    <Text style={styles.todayStatusLabel}>TODAY</Text>
                    <Text style={[styles.todayStatusValue, { color: todayColor }]}>{statusLabel(habit.todayStatus?.key)}</Text>
                  </View>

                  <View style={styles.metricsRow}>
                    <Metric label="Consistency" value={completion == null ? "—" : `${completion}%`} />
                    <Metric label="Current streak" value={`${habit.metrics?.currentStreak ?? 0} days`} />
                    <Metric label="Days tracked" value={`${habit.metrics?.totalRecorded ?? 0}`} />
                  </View>
                  {completion != null ? (
                    <View style={styles.smallProgressTrack}><View style={[styles.smallProgressFill, { width: `${completion}%` }]} /></View>
                  ) : (
                    <Text style={styles.noDataNote}>Keep recording this habit to build a reliable trend.</Text>
                  )}

                  <View style={styles.coachPanel}>
                    <View style={styles.coachHeader}>
                      <View style={[styles.coachSpark, { backgroundColor: `${coachColor}22` }]}><Text style={[styles.coachSparkText, { color: coachColor }]}>✦</Text></View>
                      <View style={styles.coachHeadingWrap}>
                        <Text style={styles.coachEyebrow}>YOUR COACH SAYS</Text>
                        <Text style={styles.coachTitle}>{habit.feedback?.headline || "Keep building consistency"}</Text>
                      </View>
                      {habit.feedback?.status ? <View style={[styles.coachStatusPill, { borderColor: `${coachColor}70` }]}><Text style={[styles.coachStatusText, { color: coachColor }]}>{habit.feedback.status.replace(/_/g, " ")}</Text></View> : null}
                    </View>
                    <Text style={styles.coachMessage}>{habit.feedback?.message || "Keep recording your progress. More history helps create more useful feedback."}</Text>
                    {habit.feedback?.action ? (
                      <View style={styles.actionBox}><Text style={styles.actionLabel}>NEXT SMALL STEP</Text><Text style={styles.actionText}>{habit.feedback.action}</Text></View>
                    ) : null}
                    {habit.feedback?.motivation ? <Text style={styles.motivation}>“{habit.feedback.motivation}”</Text> : null}
                    {!!habit.feedback?.tips?.length && (
                      <View style={styles.tipsBlock}>
                        <Text style={styles.tipsTitle}>TRY THIS</Text>
                        {habit.feedback.tips.map((tip, i) => <View key={`${habit.habitId}-tip-${i}`} style={styles.tipRow}><Text style={styles.tipBullet}>•</Text><Text style={styles.tipText}>{tip}</Text></View>)}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            <View style={styles.footerCard}>
              <Text style={styles.footerTitle}>Progress, not perfection.</Text>
              <Text style={styles.footerText}>Your insights use recorded habit history. Predictions and feedback become more useful as you consistently log your habits.</Text>
              <Text style={styles.updatedText}>Last updated: {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : "Unknown"}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor: `${color}1D` }]}><Text style={[styles.summaryIconText, { color }]}>{icon}</Text></View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metricItem}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 36 },
  backButton: { alignSelf: "flex-start", paddingVertical: 8, paddingRight: 14, marginBottom: 19 },
  backText: { color: COLORS.green, fontSize: 14, fontWeight: "700" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  headerCopy: { flex: 1, paddingRight: 12 },
  eyebrow: { color: COLORS.green, fontSize: 10, fontWeight: "800", letterSpacing: 2 },
  title: { color: COLORS.text, fontSize: 31, fontWeight: "900", letterSpacing: -0.8, marginTop: 7 },
  subtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 7, maxWidth: 280 },
  headerIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: COLORS.greenDark, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#34553B" },
  headerIconText: { color: COLORS.green, fontSize: 27, fontWeight: "700" },
  heroCard: { backgroundColor: COLORS.surfaceRaised, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "#344638", marginBottom: 27 },
  heroTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  heroLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  heroPercent: { color: COLORS.text, fontSize: 48, lineHeight: 56, fontWeight: "900", marginTop: 7, letterSpacing: -1.5 },
  heroPercentSign: { color: COLORS.green, fontSize: 25, fontWeight: "800" },
  heroBadge: { backgroundColor: "#293D2D", paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9, marginTop: 2 },
  heroBadgeText: { color: COLORS.green, fontSize: 8, fontWeight: "800", letterSpacing: 0.5 },
  progressTrack: { height: 8, backgroundColor: "#2B362E", borderRadius: 10, overflow: "hidden", marginTop: 10 },
  progressFill: { height: "100%", backgroundColor: COLORS.green, borderRadius: 10 },
  heroHint: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 11 },
  heroDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 17 },
  heroStats: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatValue: { color: COLORS.text, fontSize: 19, fontWeight: "900" },
  heroStatLabel: { color: COLORS.muted, fontSize: 10, marginTop: 4 },
  heroStatDivider: { height: 29, width: 1, backgroundColor: COLORS.border },
  sectionHeadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 13, marginTop: 2 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  sectionSubtitle: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 27 },
  summaryCard: { width: "47%", flexGrow: 1, minHeight: 112, padding: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 17 },
  summaryIcon: { width: 29, height: 29, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 9 },
  summaryIconText: { fontSize: 17, fontWeight: "900" },
  summaryValue: { color: COLORS.text, fontSize: 23, fontWeight: "900" },
  summaryLabel: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  countBadge: { minWidth: 30, height: 30, borderRadius: 10, backgroundColor: COLORS.greenDark, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  countBadgeText: { color: COLORS.green, fontSize: 12, fontWeight: "900" },
  habitCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 22, padding: 15, marginBottom: 15 },
  habitTopRow: { flexDirection: "row", alignItems: "center" },
  habitSymbol: { width: 43, height: 43, borderRadius: 14, backgroundColor: COLORS.greenDark, alignItems: "center", justifyContent: "center", marginRight: 11 },
  habitSymbolText: { color: COLORS.green, fontSize: 18, fontWeight: "900" },
  habitTitleWrap: { flex: 1 },
  habitCategory: { color: COLORS.green, fontSize: 9, fontWeight: "800", letterSpacing: 0.7, textTransform: "uppercase" },
  habitTitle: { color: COLORS.text, fontSize: 16, fontWeight: "800", marginTop: 4 },
  statusDot: { width: 9, height: 9, borderRadius: 5, marginLeft: 8 },
  todayStatusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 17, paddingVertical: 10, paddingHorizontal: 11, backgroundColor: "#101612", borderRadius: 11 },
  todayStatusLabel: { color: COLORS.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  todayStatusValue: { fontSize: 11, fontWeight: "800" },
  metricsRow: { flexDirection: "row", marginTop: 16, marginBottom: 13 },
  metricItem: { flex: 1, paddingRight: 4 },
  metricValue: { color: COLORS.text, fontSize: 14, fontWeight: "800" },
  metricLabel: { color: COLORS.muted, fontSize: 9, marginTop: 5, lineHeight: 13 },
  smallProgressTrack: { height: 5, backgroundColor: "#2B362E", borderRadius: 8, overflow: "hidden" },
  smallProgressFill: { height: "100%", backgroundColor: COLORS.green, borderRadius: 8 },
  noDataNote: { color: COLORS.muted, fontSize: 10, lineHeight: 15, marginTop: 2 },
  coachPanel: { marginTop: 16, padding: 13, backgroundColor: "#101612", borderWidth: 1, borderColor: "#26342A", borderRadius: 16 },
  coachHeader: { flexDirection: "row", alignItems: "center" },
  coachSpark: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", marginRight: 9 },
  coachSparkText: { fontSize: 18, fontWeight: "900" },
  coachHeadingWrap: { flex: 1 },
  coachEyebrow: { color: COLORS.muted, fontSize: 8, fontWeight: "800", letterSpacing: 1.3 },
  coachTitle: { color: COLORS.text, fontSize: 13, fontWeight: "800", marginTop: 4, flexShrink: 1 },
  coachStatusPill: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 5, marginLeft: 5, maxWidth: 100 },
  coachStatusText: { fontSize: 8, fontWeight: "800", textTransform: "capitalize" },
  coachMessage: { color: "#C1CDC3", fontSize: 12, lineHeight: 19, marginTop: 12 },
  actionBox: { backgroundColor: "#1A2820", borderLeftWidth: 3, borderLeftColor: COLORS.green, borderRadius: 9, padding: 11, marginTop: 12 },
  actionLabel: { color: COLORS.green, fontSize: 8, fontWeight: "900", letterSpacing: 1.2, marginBottom: 5 },
  actionText: { color: COLORS.text, fontSize: 11, lineHeight: 17, fontWeight: "600" },
  motivation: { color: COLORS.green, fontSize: 11, fontStyle: "italic", lineHeight: 17, marginTop: 12 },
  tipsBlock: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 13, paddingTop: 12 },
  tipsTitle: { color: COLORS.muted, fontSize: 8, fontWeight: "900", letterSpacing: 1.2, marginBottom: 8 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 7 },
  tipBullet: { color: COLORS.green, fontSize: 14, marginRight: 8, lineHeight: 17 },
  tipText: { flex: 1, color: "#B5C1B7", fontSize: 11, lineHeight: 17 },
  footerCard: { padding: 17, borderRadius: 18, backgroundColor: COLORS.surfaceRaised, borderWidth: 1, borderColor: COLORS.border, marginTop: 6 },
  footerTitle: { color: COLORS.text, fontSize: 14, fontWeight: "800" },
  footerText: { color: COLORS.muted, fontSize: 11, lineHeight: 17, marginTop: 7 },
  updatedText: { color: "#6F7F72", fontSize: 9, marginTop: 12 },
  stateCard: { alignItems: "center", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: 23, marginTop: 10 },
  stateIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: COLORS.greenDark, alignItems: "center", justifyContent: "center", marginBottom: 13 },
  stateIconText: { color: COLORS.green, fontSize: 22, fontWeight: "900" },
  stateTitle: { color: COLORS.text, fontSize: 16, fontWeight: "800", marginTop: 12, textAlign: "center" },
  muted: { color: COLORS.muted, fontSize: 12, lineHeight: 19, marginTop: 8, textAlign: "center" },
  primaryButton: { backgroundColor: COLORS.green, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12, alignItems: "center", marginTop: 17, alignSelf: "stretch" },
  primaryButtonText: { color: COLORS.background, fontSize: 12, fontWeight: "900" },
});
