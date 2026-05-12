import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { JournalEntry, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const MOODS = [
  { score: 1 as const, label: "Awful", color: "#FF4444", icon: "frown" },
  { score: 2 as const, label: "Bad", color: "#FF8C42", icon: "meh" },
  { score: 3 as const, label: "Okay", color: "#FFD166", icon: "meh" },
  { score: 4 as const, label: "Good", color: "#06D6A0", icon: "smile" },
  { score: 5 as const, label: "Great", color: "#4A9FFF", icon: "smile" },
];

function getMood(score: number) {
  return MOODS.find((m) => m.score === score) || MOODS[2];
}

interface FormState {
  title: string;
  content: string;
  mood: 1 | 2 | 3 | 4 | 5;
  date: string;
}

const today = new Date().toISOString().split("T")[0];

const DEFAULT_FORM: FormState = {
  title: "",
  content: "",
  mood: 3,
  date: today,
};

export default function JournalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { journalEntries, addJournalEntry, updateJournalEntry, deleteJournalEntry } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 100;

  function openAdd() {
    setForm({ ...DEFAULT_FORM, date: new Date().toISOString().split("T")[0] });
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(entry: JournalEntry) {
    setForm({
      title: entry.title,
      content: entry.content,
      mood: entry.mood,
      date: entry.date,
    });
    setEditingId(entry.id);
    setShowModal(true);
  }

  function handleSave() {
    if (!form.content.trim()) return;
    if (editingId) {
      updateJournalEntry(editingId, {
        title: form.title.trim(),
        content: form.content.trim(),
        mood: form.mood,
        date: form.date,
      });
    } else {
      addJournalEntry({
        title: form.title.trim(),
        content: form.content.trim(),
        mood: form.mood,
        date: form.date,
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
  }

  function handleDelete(id: string) {
    Alert.alert("Delete Entry", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: () => {
          deleteJournalEntry(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      },
    ]);
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  function renderEntry({ item }: { item: JournalEntry }) {
    const mood = getMood(item.mood);
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => openEdit(item)}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.cardTop}>
          <View style={[styles.moodBubble, { backgroundColor: mood.color + "22" }]}>
            <Text style={[styles.moodScore, { color: mood.color }]}>{item.mood}</Text>
          </View>
          <View style={styles.cardText}>
            {item.title.trim() ? (
              <Text style={[styles.entryTitle, { color: colors.foreground }]} numberOfLines={1}>
                {item.title}
              </Text>
            ) : null}
            <Text style={[styles.entryDate, { color: colors.mutedForeground }]}>
              {formatDate(item.date)}
            </Text>
            <View style={[styles.moodPill, { backgroundColor: mood.color + "22" }]}>
              <Text style={[styles.moodPillText, { color: mood.color }]}>{mood.label}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.id)}
          >
            <Feather name="trash-2" size={15} color={colors.destructive} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.entryPreview, { color: colors.mutedForeground }]} numberOfLines={3}>
          {item.content}
        </Text>
      </TouchableOpacity>
    );
  }

  // Mood streak: count consecutive days with entries
  const moodAvg = journalEntries.length > 0
    ? journalEntries.reduce((sum, e) => sum + e.mood, 0) / journalEntries.length
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Journal</Text>
          {moodAvg !== null && (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {journalEntries.length} {journalEntries.length === 1 ? "entry" : "entries"} · avg mood {moodAvg.toFixed(1)}
            </Text>
          )}
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Mood summary strip */}
      {journalEntries.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.moodStrip}
        >
          {MOODS.map((m) => {
            const count = journalEntries.filter((e) => e.mood === m.score).length;
            return (
              <View key={m.score} style={[styles.moodChip, { backgroundColor: m.color + "18" }]}>
                <Text style={[styles.moodChipScore, { color: m.color }]}>{m.score}</Text>
                <Text style={[styles.moodChipLabel, { color: m.color }]}>{m.label}</Text>
                <Text style={[styles.moodChipCount, { color: m.color }]}>{count}x</Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      <FlatList
        data={journalEntries}
        keyExtractor={(item) => item.id}
        renderItem={renderEntry}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!journalEntries.length}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="book-open" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No entries yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Tap + to write your first journal entry</Text>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingId ? "Edit Entry" : "New Entry"}
              </Text>
              <TouchableOpacity onPress={handleSave}>
                <Text style={[styles.modalSave, { color: colors.primary }]}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Mood selector */}
              <Text style={[styles.label, { color: colors.mutedForeground }]}>How are you feeling?</Text>
              <View style={styles.moodSelector}>
                {MOODS.map((m) => {
                  const selected = form.mood === m.score;
                  return (
                    <TouchableOpacity
                      key={m.score}
                      style={[
                        styles.moodOption,
                        {
                          backgroundColor: selected ? m.color + "22" : colors.card,
                          borderColor: selected ? m.color : colors.border,
                        },
                      ]}
                      onPress={() => {
                        setForm((f) => ({ ...f, mood: m.score }));
                        Haptics.selectionAsync();
                      }}
                    >
                      <Text style={[styles.moodOptionScore, { color: selected ? m.color : colors.mutedForeground }]}>
                        {m.score}
                      </Text>
                      <Text style={[styles.moodOptionLabel, { color: selected ? m.color : colors.mutedForeground }]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Date */}
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={form.date}
                onChangeText={(t) => setForm((f) => ({ ...f, date: t }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.mutedForeground}
              />

              {/* Title */}
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Title (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={form.title}
                onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
                placeholder="Give this entry a title..."
                placeholderTextColor={colors.mutedForeground}
              />

              {/* Content */}
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Entry</Text>
              <TextInput
                style={[styles.input, styles.journalInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={form.content}
                onChangeText={(t) => setForm((f) => ({ ...f, content: t }))}
                placeholder="What's on your mind today?"
                placeholderTextColor={colors.mutedForeground}
                multiline
                textAlignVertical="top"
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  moodStrip: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  moodChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignItems: "center", gap: 2 },
  moodChipScore: { fontSize: 16, fontFamily: "Inter_700Bold" },
  moodChipLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  moodChipCount: { fontSize: 10, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  moodBubble: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  moodScore: { fontSize: 18, fontFamily: "Inter_700Bold" },
  cardText: { flex: 1, gap: 4 },
  entryTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  entryDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  moodPill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  moodPillText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  deleteBtn: { padding: 4 },
  entryPreview: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  modalCancel: { fontSize: 15, fontFamily: "Inter_400Regular" },
  modalTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  modalSave: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modalBody: { padding: 20, gap: 8, paddingBottom: 60 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 },
  moodSelector: { flexDirection: "row", gap: 6, marginTop: 4 },
  moodOption: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, alignItems: "center", gap: 2 },
  moodOptionScore: { fontSize: 18, fontFamily: "Inter_700Bold" },
  moodOptionLabel: { fontSize: 9, fontFamily: "Inter_500Medium" },
  input: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  journalInput: { height: 200, textAlignVertical: "top" },
});
