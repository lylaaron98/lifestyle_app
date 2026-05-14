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

import { SavingsPot, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const ICONS = ["target", "home", "briefcase", "trending-up", "heart", "gift", "umbrella", "star", "sun", "globe"];
const COLORS = ["#2B7FFF", "#06D6A0", "#FFD166", "#C77DFF", "#FF6B6B", "#4CC9F0", "#FB8500", "#8AC926", "#F72585", "#FF4D6D"];

interface FormState {
  name: string;
  type: "savings" | "investment";
  currentAmount: string;
  goalAmount: string;
  notes: string;
  color: string;
  icon: string;
}

const DEFAULT_FORM: FormState = {
  name: "",
  type: "savings",
  currentAmount: "",
  goalAmount: "",
  notes: "",
  color: COLORS[0],
  icon: ICONS[0],
};

export default function SavingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { savingsPots, addSavingsPot, updateSavingsPot, deleteSavingsPot, currency } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [depositId, setDepositId] = useState<string | null>(null);
  const [depositAmt, setDepositAmt] = useState("");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 100;

  const totalSaved = savingsPots.reduce((sum, p) => sum + p.currentAmount, 0);
  const totalGoal = savingsPots.reduce((sum, p) => sum + p.goalAmount, 0);

  function openAdd() {
    setForm(DEFAULT_FORM);
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(pot: SavingsPot) {
    setForm({
      name: pot.name,
      type: pot.type,
      currentAmount: pot.currentAmount.toString(),
      goalAmount: pot.goalAmount.toString(),
      notes: pot.notes,
      color: pot.color,
      icon: pot.icon,
    });
    setEditingId(pot.id);
    setShowModal(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;
    const current = parseFloat(form.currentAmount) || 0;
    const goal = parseFloat(form.goalAmount) || 0;

    if (editingId) {
      updateSavingsPot(editingId, {
        name: form.name.trim(),
        type: form.type,
        currentAmount: current,
        goalAmount: goal,
        notes: form.notes,
        color: form.color,
        icon: form.icon,
      });
    } else {
      addSavingsPot({
        name: form.name.trim(),
        type: form.type,
        currentAmount: current,
        goalAmount: goal,
        notes: form.notes,
        color: form.color,
        icon: form.icon,
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
  }

  function handleDelete(id: string) {
    Alert.alert("Delete", "Remove this pot?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: () => {
          deleteSavingsPot(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      },
    ]);
  }

  function handleDeposit(pot: SavingsPot) {
    const amt = parseFloat(depositAmt);
    if (isNaN(amt) || amt <= 0) return;
    updateSavingsPot(pot.id, { currentAmount: pot.currentAmount + amt });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDepositId(null);
    setDepositAmt("");
  }

  function renderPot({ item }: { item: SavingsPot }) {
    const progress = item.goalAmount > 0 ? Math.min(item.currentAmount / item.goalAmount, 1) : 0;
    const remaining = Math.max(item.goalAmount - item.currentAmount, 0);
    const isDepositing = depositId === item.id;

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: item.color + "22" }]}>
            <Feather name={item.icon as any} size={20} color={item.color} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardName, { color: colors.foreground }]}>{item.name}</Text>
            <View style={[styles.badge, { backgroundColor: item.color + "22" }]}>
              <Text style={[styles.badgeText, { color: item.color }]}>
                {item.type === "savings" ? "Savings" : "Investment"}
              </Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
              <Feather name="edit-2" size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconBtn}>
              <Feather name="trash-2" size={15} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.amounts}>
          <View>
            <Text style={[styles.currentAmt, { color: colors.foreground }]}>
              {currency}{item.currentAmount.toLocaleString()}
            </Text>
            <Text style={[styles.goalAmt, { color: colors.mutedForeground }]}>
              of {currency}{item.goalAmount.toLocaleString()} goal
            </Text>
          </View>
          <Text style={[styles.pct, { color: item.color }]}>
            {(progress * 100).toFixed(0)}%
          </Text>
        </View>

        <View style={[styles.track, { backgroundColor: colors.muted }]}>
          <View style={[styles.fill, { width: `${progress * 100}%` as any, backgroundColor: item.color }]} />
        </View>

        {remaining > 0 && (
          <Text style={[styles.remaining, { color: colors.mutedForeground }]}>
            {currency}{remaining.toLocaleString()} remaining
          </Text>
        )}

        {item.notes.trim() ? (
          <Text style={[styles.notes, { color: colors.mutedForeground }]}>{item.notes}</Text>
        ) : null}

        {/* Deposit row */}
        {isDepositing ? (
          <View style={styles.depositRow}>
            <TextInput
              style={[styles.depositInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              value={depositAmt}
              onChangeText={setDepositAmt}
              placeholder="Amount"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.depositBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleDeposit(item)}
            >
              <Text style={styles.depositBtnText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setDepositId(null); setDepositAmt(""); }}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.depositTrigger, { borderColor: item.color + "50" }]}
            onPress={() => { setDepositId(item.id); setDepositAmt(""); }}
          >
            <Feather name="plus-circle" size={14} color={item.color} />
            <Text style={[styles.depositTriggerText, { color: item.color }]}>Add funds</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Savings</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {currency}{totalSaved.toLocaleString()} saved
          </Text>
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Overall summary */}
      {savingsPots.length > 0 && (
        <View style={[styles.summary, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={[styles.summaryTrack, { backgroundColor: colors.muted }]}>
            <View
              style={[styles.summaryFill, { width: `${totalGoal > 0 ? Math.min(totalSaved / totalGoal, 1) * 100 : 0}%` as any, backgroundColor: colors.primary }]}
            />
          </View>
          <Text style={[styles.summaryText, { color: colors.mutedForeground }]}>
            {currency}{totalSaved.toLocaleString()} / {currency}{totalGoal.toLocaleString()} overall goal
          </Text>
        </View>
      )}

      <FlatList
        data={savingsPots}
        keyExtractor={(item) => item.id}
        renderItem={renderPot}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!savingsPots.length}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="trending-up" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No savings pots</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Create a pot to track your savings or investments</Text>
          </View>
        }
      />

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingId ? "Edit" : "New"} Pot
              </Text>
              <TouchableOpacity onPress={handleSave}>
                <Text style={[styles.modalSave, { color: colors.primary }]}>Save</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={form.name}
                onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
                placeholder="e.g. Holiday Fund"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Type</Text>
              <View style={styles.pillRow}>
                {(["savings", "investment"] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.pill, { borderColor: colors.border, backgroundColor: form.type === t ? colors.primary : colors.card }]}
                    onPress={() => setForm((f) => ({ ...f, type: t }))}
                  >
                    <Text style={[styles.pillText, { color: form.type === t ? "#fff" : colors.foreground }]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Current Amount ({currency})</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={form.currentAmount}
                onChangeText={(t) => setForm((f) => ({ ...f, currentAmount: t }))}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
              />

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Goal Amount ({currency})</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={form.goalAmount}
                onChangeText={(t) => setForm((f) => ({ ...f, goalAmount: t }))}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
              />

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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  summary: { paddingHorizontal: 20, paddingVertical: 12, gap: 6, borderBottomWidth: 1 },
  summaryTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  summaryFill: { height: "100%", borderRadius: 2 },
  summaryText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1, gap: 4 },
  cardName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  badge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  cardActions: { flexDirection: "row", gap: 4 },
  iconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  amounts: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  currentAmt: { fontSize: 22, fontFamily: "Inter_700Bold" },
  goalAmt: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  pct: { fontSize: 20, fontFamily: "Inter_700Bold" },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  remaining: { fontSize: 12, fontFamily: "Inter_400Regular" },
  notes: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  depositRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  depositInput: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  depositBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  depositBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  depositTrigger: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  depositTriggerText: { fontSize: 13, fontFamily: "Inter_500Medium" },
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
