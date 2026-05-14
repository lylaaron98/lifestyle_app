import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { fetchSingaporeHolidays, SingaporeCalendarEvent } from "@/constants/singaporeCalendar";

WebBrowser.maybeCompleteAuthSession();

interface CalendarEvent {
  title: string;
  date: string;
}

interface IcalFeed {
  id: string;
  name: string;
  url: string;
  color: string;
  enabled: boolean;
}

const ICAL_COLORS = ["#9B59B6", "#3498DB", "#E74C3C", "#1ABC9C", "#E67E22"];
const ICAL_FEEDS_KEY = "calendar:ical_feeds";

const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MOOD_COLORS: Record<number, string> = {
  1: "#EF4444", 2: "#F97316", 3: "#EAB308", 4: "#22C55E", 5: "#06D6A0",
};
const MOOD_LABELS: Record<number, string> = {
  1: "Awful", 2: "Bad", 3: "Okay", 4: "Good", 5: "Great",
};

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toLocalDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00");
}

function formatSingaporeWeekday(dateStr: string) {
  return toLocalDate(dateStr).toLocaleDateString("en-GB", { weekday: "long" });
}

function formatSingaporeDate(dateStr: string) {
  return toLocalDate(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function parseICS(text: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const blocks = text.split("BEGIN:VEVENT").slice(1);
  for (const block of blocks) {
    const summary = block.match(/^SUMMARY[^:]*:(.+)$/m)?.[1]?.trim() ?? "Event";
    const dtstart = block.match(/^DTSTART[^:]*:(.+)$/m)?.[1]?.trim();
    if (!dtstart) continue;
    const d = dtstart.replace(/T.*$/, "").replace(/\//g, "");
    if (d.length < 8) continue;
    const date = `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
    events.push({ title: summary, date });
  }
  return events;
}

type DayData = {
  hasExpense: boolean;
  hasJournal: boolean;
  hasGoogleEvent: boolean;
  hasSingaporeEvent: boolean;
  hasIcalEvent: boolean;
  expenseCount: number;
  journalCount: number;
  googleEvents: CalendarEvent[];
  singaporeEvents: CalendarEvent[];
  icalEvents: CalendarEvent[];
};

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { expenses, journalEntries } = useApp();

  // ── Google Calendar ────────────────────────────────────────────────────────
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "",
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });

  React.useEffect(() => {
    if (response?.type === "success") {
      const accessToken = (response as any).authentication?.accessToken as string | undefined;
      if (accessToken) {
        fetchGoogleCalendarEvents(accessToken);
        setGoogleConnected(true);
      }
    }
  }, [response]);

  async function fetchGoogleCalendarEvents(accessToken: string): Promise<void> {
    try {
      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=50&orderBy=startTime&singleEvents=true",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();
      const events: CalendarEvent[] = (data.items ?? []).map((event: any) => ({
        title: event.summary ?? "Untitled",
        date: ((event.start?.date ?? event.start?.dateTime ?? "") as string).substring(0, 10),
      }));
      setGoogleEvents(events);
    } catch (e) {
      console.warn("Failed to fetch Google Calendar events", e);
    }
  }

  // ── iCal Feeds ─────────────────────────────────────────────────────────────
  const [icalFeeds, setIcalFeeds] = useState<IcalFeed[]>([]);
  const [icalEvents, setIcalEvents] = useState<CalendarEvent[]>([]);
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newFeedName, setNewFeedName] = useState("");
  const [icalLoading, setIcalLoading] = useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem(ICAL_FEEDS_KEY)
      .then((v) => {
        if (v) {
          const feeds: IcalFeed[] = JSON.parse(v);
          setIcalFeeds(feeds);
          loadIcalFeeds(feeds);
        }
      })
      .catch(() => {});
  }, []);

  async function loadIcalFeeds(feeds: IcalFeed[]): Promise<void> {
    const enabled = feeds.filter((f) => f.enabled);
    if (!enabled.length) { setIcalEvents([]); return; }
    setIcalLoading(true);
    const events: CalendarEvent[] = [];
    for (const feed of enabled) {
      try {
        const res = await fetch(feed.url);
        const text = await res.text();
        events.push(...parseICS(text));
      } catch {}
    }
    setIcalEvents(events);
    setIcalLoading(false);
  }

  async function addIcalFeed(): Promise<void> {
    const url = newFeedUrl.trim();
    if (!url) return;
    const name = newFeedName.trim() || "Calendar";
    const feed: IcalFeed = {
      id: Date.now().toString(),
      name,
      url,
      color: ICAL_COLORS[icalFeeds.length % ICAL_COLORS.length],
      enabled: true,
    };
    const updated = [...icalFeeds, feed];
    setIcalFeeds(updated);
    await AsyncStorage.setItem(ICAL_FEEDS_KEY, JSON.stringify(updated));
    setNewFeedUrl("");
    setNewFeedName("");
    setShowAddFeed(false);
    loadIcalFeeds(updated);
  }

  async function removeIcalFeed(id: string): Promise<void> {
    const updated = icalFeeds.filter((f) => f.id !== id);
    setIcalFeeds(updated);
    await AsyncStorage.setItem(ICAL_FEEDS_KEY, JSON.stringify(updated));
    loadIcalFeeds(updated);
  }

  async function toggleIcalFeed(id: string): Promise<void> {
    const updated = icalFeeds.map((f) => f.id === id ? { ...f, enabled: !f.enabled } : f);
    setIcalFeeds(updated);
    await AsyncStorage.setItem(ICAL_FEEDS_KEY, JSON.stringify(updated));
    loadIcalFeeds(updated);
  }

  // ── Calendar state ─────────────────────────────────────────────────────────
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [showSingaporeCalendar, setShowSingaporeCalendar] = useState(true);
  const [showSources, setShowSources] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 100;
  const [singaporeEvents, setSingaporeEvents] = useState<SingaporeCalendarEvent[]>([]);

  React.useEffect(() => {
    fetchSingaporeHolidays(year).then(setSingaporeEvents).catch(() => {});
  }, [year]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const { cells } = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    let offset = firstDay.getDay() - 1;
    if (offset < 0) offset = 6;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
    const arr: (number | null)[] = [];
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - offset + 1;
      arr.push(dayNum >= 1 && dayNum <= daysInMonth ? dayNum : null);
    }
    return { cells: arr };
  }, [year, month]);

  const dayData = useMemo<Record<string, DayData>>(() => {
    const map: Record<string, DayData> = {};
    const init = (): DayData => ({
      hasExpense: false,
      hasJournal: false,
      hasGoogleEvent: false,
      hasSingaporeEvent: false,
      hasIcalEvent: false,
      expenseCount: 0,
      journalCount: 0,
      googleEvents: [],
      singaporeEvents: [],
      icalEvents: [],
    });

    expenses.forEach((e) => {
      const d = new Date(e.createdAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = d.getDate().toString();
        if (!map[key]) map[key] = init();
        map[key].hasExpense = true;
        map[key].expenseCount += 1;
      }
    });

    journalEntries.forEach((j) => {
      const d = toLocalDate(j.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = d.getDate().toString();
        if (!map[key]) map[key] = init();
        map[key].hasJournal = true;
        map[key].journalCount += 1;
      }
    });

    googleEvents.forEach((event) => {
      const d = toLocalDate(event.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = d.getDate().toString();
        if (!map[key]) map[key] = init();
        map[key].hasGoogleEvent = true;
        map[key].googleEvents.push(event);
      }
    });

    icalEvents.forEach((event) => {
      const d = toLocalDate(event.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = d.getDate().toString();
        if (!map[key]) map[key] = init();
        map[key].hasIcalEvent = true;
        map[key].icalEvents.push(event);
      }
    });

    if (showSingaporeCalendar) {
      singaporeEvents.forEach((event) => {
        const d = toLocalDate(event.date);
        if (d.getFullYear() === year && d.getMonth() === month) {
          const key = d.getDate().toString();
          if (!map[key]) map[key] = init();
          map[key].hasSingaporeEvent = true;
          map[key].singaporeEvents.push({ title: event.title, date: event.date });
        }
      });
    }

    return map;
  }, [expenses, journalEntries, googleEvents, icalEvents, singaporeEvents, year, month, showSingaporeCalendar]);

  const selectedExpenses = useMemo(
    () => selectedDate ? expenses.filter((e) => isSameDay(new Date(e.createdAt), selectedDate)) : [],
    [expenses, selectedDate]
  );
  const selectedJournal = useMemo(
    () => selectedDate ? journalEntries.filter((j) => isSameDay(toLocalDate(j.date), selectedDate)) : [],
    [journalEntries, selectedDate]
  );
  const selectedSingaporeEvents = useMemo(
    () => selectedDate && showSingaporeCalendar
      ? singaporeEvents.filter((e) => isSameDay(toLocalDate(e.date), selectedDate))
      : [],
    [singaporeEvents, selectedDate, showSingaporeCalendar]
  );
  const selectedIcalEvents = useMemo(
    () => selectedDate ? icalEvents.filter((e) => isSameDay(toLocalDate(e.date), selectedDate)) : [],
    [icalEvents, selectedDate]
  );
  const selectedGoogleEvents = useMemo(
    () => selectedDate ? googleEvents.filter((e) => isSameDay(toLocalDate(e.date), selectedDate)) : [],
    [googleEvents, selectedDate]
  );
  const upcomingSingaporeEvents = useMemo(
    () => showSingaporeCalendar
      ? singaporeEvents.filter((e) => {
          const d = toLocalDate(e.date);
          return d.getFullYear() === year && d.getMonth() === month;
        })
      : [],
    [singaporeEvents, year, month, showSingaporeCalendar]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Calendar</Text>
        <TouchableOpacity
          style={[styles.sourcesBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowSources((v) => !v)}
        >
          <Feather name="layers" size={15} color={colors.foreground} />
          <Text style={[styles.sourcesBtnText, { color: colors.foreground }]}>Sources</Text>
          {icalLoading && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 2 }} />}
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
      {showSources && (
        <View style={[styles.sourcesPanel, { backgroundColor: colors.card, borderColor: colors.border, position: "absolute", top: 0, left: 0, right: 0, zIndex: 20 }]}>

          {/* Singapore Public Holidays */}
          <View style={styles.sourceRow}>
            <View style={[styles.sourceIcon, { backgroundColor: "#F59E0B22" }]}>
              <Text style={{ fontSize: 14 }}>🇸🇬</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sourceRowTitle, { color: colors.foreground }]}>Singapore Public Holidays</Text>
              <Text style={[styles.sourceRowSub, { color: colors.mutedForeground }]}>data.gov.sg · Ministry of Manpower</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, { backgroundColor: showSingaporeCalendar ? "#F59E0B" : colors.border }]}
              onPress={() => setShowSingaporeCalendar((v) => !v)}
            >
              <View style={[styles.toggleThumb, { left: showSingaporeCalendar ? 18 : 2 }]} />
            </TouchableOpacity>
          </View>

          <View style={[styles.sourceDivider, { backgroundColor: colors.border }]} />

          {/* Google Calendar */}
          <View style={styles.sourceRow}>
            <View style={[styles.sourceIcon, { backgroundColor: "#4285F422" }]}>
              <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#4285F4" }}>G</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sourceRowTitle, { color: colors.foreground }]}>Google Calendar</Text>
              <Text style={[styles.sourceRowSub, { color: colors.mutedForeground }]}>
                {googleConnected ? `${googleEvents.length} events loaded` : "Not connected"}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.connectBtn, {
                backgroundColor: googleConnected ? "#4285F422" : "#4285F4",
                borderColor: "#4285F4",
              }]}
              onPress={() => promptAsync()}
              disabled={!request}
            >
              <Text style={[styles.connectBtnText, { color: googleConnected ? "#4285F4" : "#fff" }]}>
                {googleConnected ? "Refresh" : "Connect"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.sourceDivider, { backgroundColor: colors.border }]} />

          {/* iCal Feeds */}
          {icalFeeds.map((feed, idx) => (
            <View key={feed.id}>
              <View style={styles.sourceRow}>
                <View style={[styles.sourceIcon, { backgroundColor: feed.color + "22" }]}>
                  <Feather name="rss" size={14} color={feed.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sourceRowTitle, { color: colors.foreground }]}>{feed.name}</Text>
                  <Text style={[styles.sourceRowSub, { color: colors.mutedForeground }]} numberOfLines={1}>{feed.url}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                  <TouchableOpacity
                    style={[styles.toggle, { backgroundColor: feed.enabled ? feed.color : colors.border }]}
                    onPress={() => toggleIcalFeed(feed.id)}
                  >
                    <View style={[styles.toggleThumb, { left: feed.enabled ? 18 : 2 }]} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeIcalFeed(feed.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="trash-2" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>
              {idx < icalFeeds.length - 1 || showAddFeed ? (
                <View style={[styles.sourceDivider, { backgroundColor: colors.border }]} />
              ) : null}
            </View>
          ))}

          {/* Add iCal Feed */}
          {showAddFeed ? (
            <View style={styles.addFeedForm}>
              <TextInput
                style={[styles.feedInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Feed name (e.g. Work, School)"
                placeholderTextColor={colors.mutedForeground}
                value={newFeedName}
                onChangeText={setNewFeedName}
              />
              <TextInput
                style={[styles.feedInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                placeholder="iCal URL (https://...ics)"
                placeholderTextColor={colors.mutedForeground}
                value={newFeedUrl}
                onChangeText={setNewFeedUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity style={[styles.addFeedBtn, { backgroundColor: colors.primary, flex: 1 }]} onPress={addIcalFeed}>
                  <Text style={[styles.addFeedBtnText, { color: "#fff" }]}>Add Feed</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addFeedBtn, { backgroundColor: colors.border }]}
                  onPress={() => { setShowAddFeed(false); setNewFeedUrl(""); setNewFeedName(""); }}
                >
                  <Text style={[styles.addFeedBtnText, { color: colors.foreground }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addFeedRow} onPress={() => setShowAddFeed(true)}>
              <Feather name="plus-circle" size={15} color={colors.primary} />
              <Text style={[styles.addFeedRowText, { color: colors.primary }]}>Add iCal / ICS feed</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad }}>
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

        <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.dayLabels}>
            {DAY_LABELS.map((d) => (
              <Text key={d} style={[styles.dayLabel, { color: colors.mutedForeground }]}>{d}</Text>
            ))}
          </View>

          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <View key={row} style={styles.row}>
              {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                if (day === null) return <View key={col} style={styles.cell} />;
                const data = dayData[day.toString()];
                const cellDate = new Date(year, month, day);
                const todayStyle = isSameDay(cellDate, today);
                const selectedStyle = selectedDate ? isSameDay(cellDate, selectedDate) : false;
                return (
                  <TouchableOpacity
                    key={col}
                    style={[styles.cell, selectedStyle && { backgroundColor: colors.primary, borderRadius: 12 }]}
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
                        {data.hasExpense && <View style={[styles.dot, { backgroundColor: selectedStyle ? "rgba(255,255,255,0.7)" : colors.primary }]} />}
                        {data.hasJournal && <View style={[styles.dot, { backgroundColor: selectedStyle ? "rgba(255,255,255,0.7)" : "#06D6A0" }]} />}
                        {data.hasGoogleEvent && <View style={[styles.dot, { backgroundColor: selectedStyle ? "rgba(255,255,255,0.7)" : "#4285F4" }]} />}
                        {data.hasIcalEvent && <View style={[styles.dot, { backgroundColor: selectedStyle ? "rgba(255,255,255,0.7)" : "#9B59B6" }]} />}
                        {data.hasSingaporeEvent && <View style={[styles.dot, { backgroundColor: selectedStyle ? "rgba(255,255,255,0.7)" : "#F59E0B" }]} />}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          <View style={[styles.legend, { borderTopColor: colors.border }]}>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.primary }]} /><Text style={[styles.legendText, { color: colors.mutedForeground }]}>Expense</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: "#06D6A0" }]} /><Text style={[styles.legendText, { color: colors.mutedForeground }]}>Journal</Text></View>
            {googleConnected && <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: "#4285F4" }]} /><Text style={[styles.legendText, { color: colors.mutedForeground }]}>Google</Text></View>}
            {icalFeeds.some((f) => f.enabled) && <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: "#9B59B6" }]} /><Text style={[styles.legendText, { color: colors.mutedForeground }]}>iCal</Text></View>}
            {showSingaporeCalendar && <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: "#F59E0B" }]} /><Text style={[styles.legendText, { color: colors.mutedForeground }]}>SG holiday</Text></View>}
          </View>
        </View>

        {showSingaporeCalendar && upcomingSingaporeEvents.length > 0 && (
          <View style={[styles.nationalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.nationalHeader}>
              <View>
                <Text style={[styles.nationalTitle, { color: colors.foreground }]}>Singapore calendar</Text>
                <Text style={[styles.nationalSubtitle, { color: colors.mutedForeground }]}>
                  Public holidays for {MONTH_NAMES[month]} {year} · live from data.gov.sg
                </Text>
              </View>
              <Feather name="flag" size={18} color="#F59E0B" />
            </View>
            <View style={styles.nationalList}>
              {upcomingSingaporeEvents.map((event) => (
                <View key={event.date} style={styles.nationalRow}>
                  <View style={[styles.nationalDot, { backgroundColor: "#F59E0B" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.nationalRowTitle, { color: colors.foreground }]}>{event.title}</Text>
                    <Text style={[styles.nationalRowMeta, { color: colors.mutedForeground }]}>
                      {formatSingaporeWeekday(event.date)} · {formatSingaporeDate(event.date)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {selectedDate && (
          <View style={styles.entriesSection}>
            <Text style={[styles.entriesDate, { color: colors.foreground }]}>
              {selectedDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </Text>

            {selectedExpenses.length === 0 && selectedJournal.length === 0 &&
             selectedSingaporeEvents.length === 0 && selectedGoogleEvents.length === 0 &&
             selectedIcalEvents.length === 0 && (
              <View style={[styles.emptyDay, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="calendar" size={24} color={colors.mutedForeground} />
                <Text style={[styles.emptyDayText, { color: colors.mutedForeground }]}>Nothing logged on this day</Text>
                <View style={styles.emptyDayActions}>
                  <TouchableOpacity style={[styles.quickBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/(tabs)/finance")}>
                    <Feather name="plus" size={14} color="#fff" />
                    <Text style={styles.quickBtnText}>Add Expense</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.quickBtn, { backgroundColor: "#06D6A0" }]} onPress={() => router.push("/(tabs)/journal")}>
                    <Feather name="book-open" size={14} color="#fff" />
                    <Text style={styles.quickBtnText}>Write Journal</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {selectedExpenses.length > 0 && (
              <View style={styles.entryGroup}>
                <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>EXPENSES ADDED ({selectedExpenses.length})</Text>
                {selectedExpenses.map((e) => (
                  <View key={e.id} style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.entryIconWrap, { backgroundColor: e.color + "22" }]}>
                      <Feather name={e.icon as any} size={16} color={e.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.entryName, { color: colors.foreground }]}>{e.name}</Text>
                      <Text style={[styles.entryMeta, { color: colors.mutedForeground }]}>{e.category} · {e.frequency}</Text>
                    </View>
                    <Text style={[styles.entryAmount, { color: colors.foreground }]}>${e.amount.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}

            {selectedJournal.length > 0 && (
              <View style={styles.entryGroup}>
                <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>JOURNAL ENTRIES ({selectedJournal.length})</Text>
                {selectedJournal.map((j) => (
                  <View key={j.id} style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.moodBubble, { backgroundColor: MOOD_COLORS[j.mood] + "22" }]}>
                      <Text style={[styles.moodNum, { color: MOOD_COLORS[j.mood] }]}>{j.mood}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      {j.title ? <Text style={[styles.entryName, { color: colors.foreground }]}>{j.title}</Text> : null}
                      <Text style={[styles.entryMeta, { color: colors.mutedForeground }]} numberOfLines={2}>{j.content}</Text>
                      <Text style={[styles.moodLabel, { color: MOOD_COLORS[j.mood] }]}>{MOOD_LABELS[j.mood]}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {selectedGoogleEvents.length > 0 && (
              <View style={styles.entryGroup}>
                <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>GOOGLE CALENDAR ({selectedGoogleEvents.length})</Text>
                {selectedGoogleEvents.map((event, i) => (
                  <View key={i} style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.entryIconWrap, { backgroundColor: "#4285F422" }]}>
                      <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#4285F4" }}>G</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.entryName, { color: colors.foreground }]}>{event.title}</Text>
                      <Text style={[styles.entryMeta, { color: colors.mutedForeground }]}>Google Calendar</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {selectedIcalEvents.length > 0 && (
              <View style={styles.entryGroup}>
                <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>ICAL EVENTS ({selectedIcalEvents.length})</Text>
                {selectedIcalEvents.map((event, i) => (
                  <View key={i} style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.entryIconWrap, { backgroundColor: "#9B59B622" }]}>
                      <Feather name="rss" size={16} color="#9B59B6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.entryName, { color: colors.foreground }]}>{event.title}</Text>
                      <Text style={[styles.entryMeta, { color: colors.mutedForeground }]}>iCal feed</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {selectedSingaporeEvents.length > 0 && (
              <View style={styles.entryGroup}>
                <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>SINGAPORE CALENDAR ({selectedSingaporeEvents.length})</Text>
                {selectedSingaporeEvents.map((event) => (
                  <View key={event.date + event.title} style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.entryIconWrap, { backgroundColor: "#F59E0B22" }]}>
                      <Feather name="flag" size={16} color="#F59E0B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.entryName, { color: colors.foreground }]}>{event.title}</Text>
                      <Text style={[styles.entryMeta, { color: colors.mutedForeground }]}>
                        {formatSingaporeWeekday(event.date)} · Public holiday
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  sourcesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  sourcesBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  sourcesPanel: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  sourceIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sourceRowTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sourceRowSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  sourceDivider: { height: 1, marginVertical: 2 },
  toggle: { width: 38, height: 22, borderRadius: 11, justifyContent: "center" },
  toggleThumb: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
  },
  connectBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  connectBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  addFeedRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  addFeedRowText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  addFeedForm: { gap: 8, paddingTop: 6 },
  feedInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  addFeedBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, alignItems: "center" },
  addFeedBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  calendarCard: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, padding: 12 },
  nationalCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  nationalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  nationalTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  nationalSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  nationalList: { gap: 10 },
  nationalRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  nationalDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  nationalRowTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  nationalRowMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  dayLabels: { flexDirection: "row", marginBottom: 4 },
  dayLabel: { flex: 1, textAlign: "center", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  row: { flexDirection: "row" },
  cell: { flex: 1, aspectRatio: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  dayNum: { fontSize: 14, fontFamily: "Inter_500Medium" },
  todayNum: { fontFamily: "Inter_700Bold" },
  dots: { flexDirection: "row", gap: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  entriesSection: { padding: 16, gap: 12 },
  entriesDate: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyDay: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", gap: 10 },
  emptyDayText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  emptyDayActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  quickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  quickBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_500Medium" },
  entryGroup: { gap: 8 },
  groupLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  entryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  entryIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  entryName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  entryMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  entryAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  moodBubble: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  moodNum: { fontSize: 16, fontFamily: "Inter_700Bold" },
  moodLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 2 },
});
