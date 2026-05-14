import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const MOOD_LABELS = ["", "Awful", "Bad", "Okay", "Good", "Great"];
const MOOD_COLORS = ["", "#FF4444", "#FF8C42", "#FFD166", "#06D6A0", "#4A9FFF"];

function toMonthly(amount: number, frequency: string) {
  switch (frequency) {
    case "daily": return amount * 30;
    case "weekly": return amount * 4.33;
    case "monthly": return amount;
    case "yearly": return amount / 12;
    default: return amount;
  }
}

export default function OverviewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { expenses, savingsPots, journalEntries, currency, profileName, profileEmoji } = useApp();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return "Good morning";
    if (h >= 12 && h < 18) return "Good afternoon";
    if (h >= 18 && h < 22) return "Good evening";
    return "Good night";
  })();

  const totalMonthly = useMemo(
    () => expenses.reduce((sum, e) => sum + toMonthly(e.amount, e.frequency), 0),
    [expenses]
  );

  const totalSaved = useMemo(
    () => savingsPots.reduce((sum, p) => sum + p.currentAmount, 0),
    [savingsPots]
  );

  const totalGoal = useMemo(
    () => savingsPots.reduce((sum, p) => sum + p.goalAmount, 0),
    [savingsPots]
  );

  const latestMood = journalEntries.length > 0 ? journalEntries[0].mood : null;

  const subscriptions = expenses.filter((e) => e.category === "subscription");
  const oneoffs = expenses.filter((e) => e.category === "expense");

  const topExpenses = [...expenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const overallProgress = totalGoal > 0 ? Math.min(totalSaved / totalGoal, 1) : 0;

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {/* Header */}
        <LinearGradient
          colors={["#0D1529", "#0A0B10"]}
          style={[styles.header, { paddingTop: topInset + 20 }]}
        >
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            {profileEmoji ? `${profileEmoji}  ` : ""}{profileName ? `${greeting}, ${profileName}` : greeting}
          </Text>
          <Text style={[styles.headline, { color: colors.foreground }]}>Financial Overview</Text>

          {/* Big monthly spend card */}
          <View style={[styles.heroCard, { backgroundColor: "rgba(43,127,255,0.12)", borderColor: "rgba(43,127,255,0.25)" }]}>
            <Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>Monthly Spend</Text>
            <Text style={[styles.heroAmount, { color: "#FFFFFF" }]}>
              {currency}{totalMonthly.toFixed(2)}
            </Text>
            <View style={styles.heroRow}>
              <View style={styles.heroPill}>
                <Feather name="refresh-cw" size={11} color="#2B7FFF" />
                <Text style={styles.heroPillText}>{subscriptions.length} subscriptions</Text>
              </View>
              <View style={styles.heroPill}>
                <Feather name="zap" size={11} color="#2B7FFF" />
                <Text style={styles.heroPillText}>{oneoffs.length} expenses</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* Savings progress */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Savings Progress</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/finance")}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.savingsRow}>
              <View style={styles.savingsText}>
                <Text style={[styles.savingsAmount, { color: colors.foreground }]}>
                  {currency}{totalSaved.toLocaleString()}
                </Text>
                <Text style={[styles.savingsGoal, { color: colors.mutedForeground }]}>
                  of {currency}{totalGoal.toLocaleString()} goal
                </Text>
              </View>
              <Text style={[styles.savingsPct, { color: colors.primary }]}>
                {(overallProgress * 100).toFixed(0)}%
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${overallProgress * 100}%` as any, backgroundColor: colors.primary },
                ]}
              />
            </View>
            {savingsPots.slice(0, 2).map((pot) => {
              const prog = pot.goalAmount > 0 ? Math.min(pot.currentAmount / pot.goalAmount, 1) : 0;
              return (
                <View key={pot.id} style={styles.potRow}>
                  <View style={[styles.potDot, { backgroundColor: pot.color }]} />
                  <Text style={[styles.potName, { color: colors.foreground }]}>{pot.name}</Text>
                  <Text style={[styles.potAmt, { color: colors.mutedForeground }]}>
                    {currency}{pot.currentAmount.toLocaleString()}
                  </Text>
                  <Text style={[styles.potPct, { color: pot.color }]}>
                    {(prog * 100).toFixed(0)}%
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Top expenses */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Top Expenses</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/finance")}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>
            {topExpenses.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="credit-card" size={28} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No expenses yet
                </Text>
              </View>
            ) : (
              topExpenses.map((e) => (
                <View key={e.id} style={styles.expenseRow}>
                  <View style={[styles.expenseIcon, { backgroundColor: e.color + "22" }]}>
                    <Feather name={e.icon as any} size={16} color={e.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.expenseName, { color: colors.foreground }]}>{e.name}</Text>
                    <Text style={[styles.expenseFreq, { color: colors.mutedForeground }]}>
                      {e.frequency}
                    </Text>
                  </View>
                  <Text style={[styles.expenseAmt, { color: colors.foreground }]}>
                    {currency}{e.amount.toFixed(2)}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Mood snapshot */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Latest Mood</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/journal")}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>Journal</Text>
              </TouchableOpacity>
            </View>
            {latestMood ? (
              <View style={styles.moodDisplay}>
                <View style={[styles.moodBubble, { backgroundColor: MOOD_COLORS[latestMood] + "22" }]}>
                  <Text style={[styles.moodScore, { color: MOOD_COLORS[latestMood] }]}>
                    {latestMood}/5
                  </Text>
                </View>
                <View>
                  <Text style={[styles.moodLabel, { color: colors.foreground }]}>
                    {MOOD_LABELS[latestMood]}
                  </Text>
                  <Text style={[styles.moodDate, { color: colors.mutedForeground }]}>
                    {new Date(journalEntries[0].date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Feather name="book-open" size={28} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  Start journaling today
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 28 },
  greeting: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 4 },
  headline: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 20 },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  heroLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6 },
  heroAmount: { fontSize: 38, fontFamily: "Inter_700Bold", marginBottom: 12 },
  heroRow: { flexDirection: "row", gap: 8 },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(43,127,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroPillText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#4A9FFF" },
  body: { padding: 16, gap: 12 },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  seeAll: { fontSize: 13, fontFamily: "Inter_500Medium" },
  savingsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  savingsText: { gap: 2 },
  savingsAmount: { fontSize: 22, fontFamily: "Inter_700Bold" },
  savingsGoal: { fontSize: 12, fontFamily: "Inter_400Regular" },
  savingsPct: { fontSize: 20, fontFamily: "Inter_700Bold" },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  potRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  potDot: { width: 8, height: 8, borderRadius: 4 },
  potName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  potAmt: { fontSize: 13, fontFamily: "Inter_400Regular" },
  potPct: { fontSize: 13, fontFamily: "Inter_600SemiBold", minWidth: 34, textAlign: "right" },
  expenseRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  expenseIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  expenseName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  expenseFreq: { fontSize: 11, fontFamily: "Inter_400Regular", textTransform: "capitalize" },
  expenseAmt: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  moodDisplay: { flexDirection: "row", alignItems: "center", gap: 14 },
  moodBubble: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  moodScore: { fontSize: 18, fontFamily: "Inter_700Bold" },
  moodLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  moodDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  emptyState: { alignItems: "center", paddingVertical: 16, gap: 8 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
