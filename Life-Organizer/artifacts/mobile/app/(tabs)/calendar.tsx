import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
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

const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function toLocalDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00");
}

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { expenses, journalEntries } = useApp();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 100;

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  // Build calendar grid
  const { days, startOffset } = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    // Monday = 0, Sunday = 6
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { days: daysInMonth, startOffset };
  }, [year, month]);

  // Map of date-key → { hasExpense, hasJournal, expenseCount, journalCount }
  const dayData = useMemo(() => {
    const map: Record<string, { hasExpense: boolean; hasJournal: boolean; expenseCount: number; journalCount: number }> = {};

    expenses.forEach((e) => {
      const d = new Date(e.createdAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = d.getDate().toString();
        if (!map[key]) map[key] = { hasExpense: false, hasJournal: false, expenseCount: 0, journalCount: 0 };
        map[key].hasExpense = true;
        map[key].expenseCount += 1;
      }
    });

    journalEntries.forEach((j) => {
      const d = toLocalDate(j.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = d.getDate().toString();
        if (!map[key]) map[key] = { hasExpense: false, hasJournal: false, expenseCount: 0, journalCount: 0 };
        map[key].hasJournal = true;
        map[key].journalCount += 1;
      }
    });

    return map;
  }, [expenses, journalEntries, year, month]);

  // Entries for selected date
  const selectedExpenses = useMemo(() => {
    if (!selectedDate) return [];
    return expenses.filter((e) => isSameDay(new Date(e.createdAt), selectedDate));
  }, [expenses, selectedDate]);

  const selectedJournal = useMemo(() => {
    if (!selectedDate) return [];
    return journalEntries.filter((j) => isSameDay(toLocalDate(j.date), selectedDate));
  }, [journalEntries, selectedDate]);

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const isSelected = (day: number) =>
    selectedDate?.getDate() === day &&
    selectedDate?.getMonth() === month &&
    selectedDate?.getFullYear() === year;

  // Build grid cells (nulls for empty slots)
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const MOOD_COLORS = ["", "#FF4444", "#FF8C42", "#FFD166", "#06D6A0", "#4A9FFF"];
  const MOOD_LABELS = ["", "Awful", "Bad", "Okay", "Good", "Great"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Calendar</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad }}>
        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={prevMonth}>
            <Feather name="chevron-left" size={18} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: colors.foreground }]}>
            {MONTH_NAMES[month]} {year}
          </Text>
          <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={nextMonth}>
            <Feather name="chevron-right" size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Calendar grid */}
        <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Day labels */}
          <View style={styles.dayLabels}>
            {DAY_LABELS.map((d) => (
              <Text key={d} style={[styles.dayLabel, { color: colors.mutedForeground }]}>{d}</Text>
            ))}
          </View>

          {/* Grid */}
          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <View key={row} style={styles.row}>
              {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                if (day === null) {
                  return <View key={col} style={styles.cell} />;
                }
                const data = dayData[day.toString()];
                const todayStyle = isToday(day);
                const selectedStyle = isSelected(day);
                return (
                  <TouchableOpacity
                    key={col}
                    style={[
                      styles.cell,
                      selectedStyle && { backgroundColor: colors.primary, borderRadius: 12 },
                    ]}
                    onPress={() => setSelectedDate(new Date(year, month, day))}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayNum,
                        { color: selectedStyle ? "#fff" : todayStyle ? colors.primary : colors.foreground },
                        todayStyle && !selectedStyle && styles.todayNum,
                      ]}
                    >
                      {day}
                    </Text>
                    {data && (
                      <View style={styles.dots}>
                        {data.hasExpense && (
                          <View style={[styles.dot, { backgroundColor: selectedStyle ? "rgba(255,255,255,0.7)" : colors.primary }]} />
                        )}
                        {data.hasJournal && (
                          <View style={[styles.dot, { backgroundColor: selectedStyle ? "rgba(255,255,255,0.7)" : "#06D6A0" }]} />
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* Legend */}
          <View style={[styles.legend, { borderTopColor: colors.border }]}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Expense added</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: "#06D6A0" }]} />
              <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Journal entry</Text>
            </View>
          </View>
        </View>

        {/* Selected day entries */}
        {selectedDate && (
          <View style={styles.entriesSection}>
            <Text style={[styles.entriesDate, { color: colors.foreground }]}>
              {selectedDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </Text>

            {selectedExpenses.length === 0 && selectedJournal.length === 0 && (
              <View style={[styles.emptyDay, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="calendar" size={24} color={colors.mutedForeground} />
                <Text style={[styles.emptyDayText, { color: colors.mutedForeground }]}>
                  Nothing logged on this day
                </Text>
                <View style={styles.emptyDayActions}>
                  <TouchableOpacity
                    style={[styles.quickBtn, { backgroundColor: colors.primary }]}
                    onPress={() => router.push("/(tabs)/expenses")}
                  >
                    <Feather name="plus" size={14} color="#fff" />
                    <Text style={styles.quickBtnText}>Add Expense</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.quickBtn, { backgroundColor: "#06D6A0" }]}
                    onPress={() => router.push("/(tabs)/journal")}
                  >
                    <Feather name="book-open" size={14} color="#fff" />
                    <Text style={styles.quickBtnText}>Write Journal</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {selectedExpenses.length > 0 && (
              <View style={styles.entryGroup}>
                <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>
                  EXPENSES ADDED ({selectedExpenses.length})
                </Text>
                {selectedExpenses.map((e) => (
                  <View key={e.id} style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.entryIconWrap, { backgroundColor: e.color + "22" }]}>
                      <Feather name={e.icon as any} size={16} color={e.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.entryName, { color: colors.foreground }]}>{e.name}</Text>
                      <Text style={[styles.entryMeta, { color: colors.mutedForeground }]}>
                        {e.category} · {e.frequency}
                      </Text>
                    </View>
                    <Text style={[styles.entryAmount, { color: colors.foreground }]}>
                      £{e.amount.toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {selectedJournal.length > 0 && (
              <View style={styles.entryGroup}>
                <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>
                  JOURNAL ENTRIES ({selectedJournal.length})
                </Text>
                {selectedJournal.map((j) => (
                  <View key={j.id} style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.moodBubble, { backgroundColor: MOOD_COLORS[j.mood] + "22" }]}>
                      <Text style={[styles.moodNum, { color: MOOD_COLORS[j.mood] }]}>{j.mood}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      {j.title ? (
                        <Text style={[styles.entryName, { color: colors.foreground }]}>{j.title}</Text>
                      ) : null}
                      <Text style={[styles.entryMeta, { color: colors.mutedForeground }]} numberOfLines={2}>
                        {j.content}
                      </Text>
                      <Text style={[styles.moodLabel, { color: MOOD_COLORS[j.mood] }]}>
                        {MOOD_LABELS[j.mood]}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16 },
  navBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  monthLabel: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  calendarCard: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, padding: 12 },
  dayLabels: { flexDirection: "row", marginBottom: 4 },
  dayLabel: { flex: 1, textAlign: "center", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  row: { flexDirection: "row" },
  cell: { flex: 1, aspectRatio: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  dayNum: { fontSize: 14, fontFamily: "Inter_500Medium" },
  todayNum: { fontFamily: "Inter_700Bold" },
  dots: { flexDirection: "row", gap: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  legend: { flexDirection: "row", justifyContent: "center", gap: 16, paddingTop: 10, marginTop: 6, borderTopWidth: 1 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  entriesSection: { padding: 16, gap: 12 },
  entriesDate: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyDay: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", gap: 10 },
  emptyDayText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  emptyDayActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  quickBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  quickBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_500Medium" },
  entryGroup: { gap: 8 },
  groupLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  entryCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 12 },
  entryIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  entryName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  entryMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  entryAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  moodBubble: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  moodNum: { fontSize: 16, fontFamily: "Inter_700Bold" },
  moodLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 2 },
});
