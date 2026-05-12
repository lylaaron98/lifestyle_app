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

import { ExpenseCategory, ExpenseFrequency, ExpenseItem, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const ICONS = ["credit-card", "wifi", "tv", "music", "cloud", "smartphone", "home", "shopping-bag", "zap", "coffee", "truck", "heart"];
const COLORS = ["#2B7FFF", "#06D6A0", "#FF6B6B", "#FFD166", "#C77DFF", "#F72585", "#4CC9F0", "#FB8500", "#8AC926", "#FF4D6D"];
const FREQUENCIES: ExpenseFrequency[] = ["daily", "weekly", "monthly", "yearly"];
const CATEGORIES: { key: ExpenseCategory; label: string }[] = [
  { key: "subscription", label: "Subscription" },
  { key: "expense", label: "One-off" },
];

function toMonthly(amount: number, frequency: string) {
  switch (frequency) {
    case "daily": return amount * 30;
    case "weekly": return amount * 4.33;
    case "yearly": return amount / 12;
    default: return amount;
  }
}

interface FormState {
  name: string;
  amount: string;
  category: ExpenseCategory;
  frequency: ExpenseFrequency;
  notes: string;
  color: string;
  icon: string;
}

const DEFAULT_FORM: FormState = {
  name: "",
  amount: "",
  category: "subscription",
  frequency: "monthly",
  notes: "",
  color: COLORS[0],
  icon: ICONS[0],
};

export default function ExpensesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { expenses, addExpense, updateExpense, deleteExpense, reorderExpense, currency } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [filter, setFilter] = useState<"all" | ExpenseCategory>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...expenses]
    .sort((a, b) => a.priority - b.priority)
    .filter((e) => filter === "all" || e.category === filter);

  const totalMonthly = sorted.reduce((sum, e) => sum + toMonthly(e.amount, e.frequency), 0);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 100;

  function openAdd() {
    setForm(DEFAULT_FORM);
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(item: ExpenseItem) {
    setForm({
      name: item.name,
      amount: item.amount.toString(),
      category: item.category,
      frequency: item.frequency,
      notes: item.notes,
      color: item.color,
      icon: item.icon,
    });
    setEditingId(item.id);
    setShowModal(true);
  }

  function handleSave() {
    if (!form.name.trim() || !form.amount) return;
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) return;

    if (editingId) {
      updateExpense(editingId, {
        name: form.name.trim(),
        amount: amt,
        category: form.category,
        frequency: form.frequency,
        notes: form.notes,
        color: form.color,
        icon: form.icon,
      });
    } else {
      addExpense({
        name: form.name.trim(),
        amount: amt,
        category: form.category,
        frequency: form.frequency,
        notes: form.notes,
        color: form.color,
        icon: form.icon,
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
  }

  function handleDelete(id: string) {
    Alert.alert("Delete", "Remove this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: () => {
          deleteExpense(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      },
    ]);
  }

  function renderItem({ item, index }: { item: ExpenseItem; index: number }) {
    const expanded = expandedId === item.id;
    const monthly = toMonthly(item.amount, item.frequency);
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setExpandedId(expanded ? null : item.id)}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.cardTop}>
          <View style={[styles.iconWrap, { backgroundColor: item.color + "22" }]}>
            <Feather name={item.icon as any} size={18} color={item.color} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardName, { color: colors.foreground }]}>{item.name}</Text>
            <View style={styles.cardMeta}>
              <View style={[styles.badge, { backgroundColor: item.color + "22" }]}>
                <Text style={[styles.badgeText, { color: item.color }]}>
                  {item.category === "subscription" ? "Sub" : "One-off"}
                </Text>
              </View>
              {item.category === "subscription" ? (
                <View style={styles.recurringChip}>
                  <Feather name="refresh-cw" size={9} color={colors.primary} />
                  <Text style={[styles.recurringText, { color: colors.primary }]}>
                    {item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {item.frequency}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.cardRight}>
            <Text style={[styles.cardAmount, { color: colors.foreground }]}>
              {currency}{item.amount.toFixed(2)}
            </Text>
            <Text style={[styles.cardMonthly, { color: colors.mutedForeground }]}>
              {currency}{monthly.toFixed(2)}/mo
            </Text>
          </View>
        </View>

        {expanded && (
          <View style={[styles.expanded, { borderTopColor: colors.border }]}>
            {item.notes.trim() ? (
              <Text style={[styles.notesText, { color: colors.mutedForeground }]}>{item.notes}</Text>
            ) : null}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: colors.border }]}
                onPress={() => reorderExpense(item.id, "up")}
                disabled={index === 0}
              >
                <Feather name="arrow-up" size={16} color={index === 0 ? colors.mutedForeground : colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: colors.border }]}
                onPress={() => reorderExpense(item.id, "down")}
                disabled={index === sorted.length - 1}
              >
                <Feather name="arrow-down" size={16} color={index === sorted.length - 1 ? colors.mutedForeground : colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: colors.border }]}
                onPress={() => openEdit(item)}
              >
                <Feather name="edit-2" size={16} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: colors.destructive + "40" }]}
                onPress={() => handleDelete(item.id)}
              >
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Expenses</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {currency}{totalMonthly.toFixed(2)}/month
          </Text>
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        {(["all", "subscription", "expense"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, { color: filter === f ? colors.primary : colors.mutedForeground }]}>
              {f === "all" ? "All" : f === "subscription" ? "Subscriptions" : "Expenses"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!sorted.length}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="credit-card" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No expenses yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Tap + to add a subscription or expense</Text>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingId ? "Edit" : "Add"} Item
              </Text>
              <TouchableOpacity onPress={handleSave}>
                <Text style={[styles.modalSave, { color: colors.primary }]}>Save</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Name */}
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={form.name}
                onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
                placeholder="e.g. Netflix"
                placeholderTextColor={colors.mutedForeground}
              />

              {/* Amount */}
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Amount ({currency})</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={form.amount}
                onChangeText={(t) => setForm((f) => ({ ...f, amount: t }))}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
              />

              {/* Category */}
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Category</Text>
              <View style={styles.pillRow}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    style={[styles.pill, { borderColor: colors.border, backgroundColor: form.category === c.key ? colors.primary : colors.card }]}
                    onPress={() => setForm((f) => ({ ...f, category: c.key }))}
                  >
                    <Text style={[styles.pillText, { color: form.category === c.key ? "#fff" : colors.foreground }]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Frequency / Billing Cycle */}
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                {form.category === "subscription" ? "Billing Cycle (Recurring)" : "Frequency"}
              </Text>
              <View style={styles.pillRow}>
                {FREQUENCIES.map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.pill, { borderColor: colors.border, backgroundColor: form.frequency === f ? colors.primary : colors.card }]}
                    onPress={() => setForm((frm) => ({ ...frm, frequency: f }))}
                  >
                    <Text style={[styles.pillText, { color: form.frequency === f ? "#fff" : colors.foreground }]}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Icon */}
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Icon</Text>
              <View style={styles.iconGrid}>
                {ICONS.map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    style={[styles.iconOption, { backgroundColor: form.icon === ic ? form.color + "33" : colors.card, borderColor: form.icon === ic ? form.color : colors.border }]}
                    onPress={() => setForm((f) => ({ ...f, icon: ic }))}
                  >
                    <Feather name={ic as any} size={20} color={form.icon === ic ? form.color : colors.mutedForeground} />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Color */}
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Color</Text>
              <View style={styles.colorRow}>
                {COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorDot, { backgroundColor: c, borderWidth: form.color === c ? 3 : 0, borderColor: "#fff" }]}
                    onPress={() => setForm((f) => ({ ...f, color: c }))}
                  />
                ))}
              </View>

              {/* Notes */}
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Notes</Text>
              <TextInput
                style={[styles.input, styles.notesInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={form.notes}
                onChangeText={(t) => setForm((f) => ({ ...f, notes: t }))}
                placeholder="Optional notes..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  filterRow: { flexDirection: "row", borderBottomWidth: 1 },
  filterTab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  filterText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardTop: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  iconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1, gap: 4 },
  cardName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular", textTransform: "capitalize" },
  recurringChip: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(43,127,255,0.12)", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  recurringText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  cardRight: { alignItems: "flex-end", gap: 2 },
  cardAmount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  cardMonthly: { fontSize: 11, fontFamily: "Inter_400Regular" },
  expanded: { borderTopWidth: 1, paddingHorizontal: 14, paddingBottom: 12, gap: 10 },
  notesText: { fontSize: 13, fontFamily: "Inter_400Regular", paddingTop: 10 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
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
  input: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  notesInput: { height: 80, textAlignVertical: "top" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  iconOption: { width: 48, height: 48, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
});
