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

import {
  ExpenseCategory,
  ExpenseFrequency,
  ExpenseItem,
  SavingsPot,
  useApp,
} from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

// ─── Expenses constants ───────────────────────────────────────────────────────
const EXP_ICONS = ["credit-card","wifi","tv","music","cloud","smartphone","home","shopping-bag","zap","coffee","truck","heart"];
const EXP_COLORS = ["#2B7FFF","#06D6A0","#FF6B6B","#FFD166","#C77DFF","#F72585","#4CC9F0","#FB8500","#8AC926","#FF4D6D"];
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

interface ExpenseForm {
  name: string; amount: string; category: ExpenseCategory;
  frequency: ExpenseFrequency; notes: string; color: string; icon: string;
}
const DEFAULT_EXP_FORM: ExpenseForm = {
  name: "", amount: "", category: "subscription", frequency: "monthly",
  notes: "", color: EXP_COLORS[0], icon: EXP_ICONS[0],
};

// ─── Savings constants ────────────────────────────────────────────────────────
const SAV_ICONS = ["target","home","briefcase","trending-up","heart","gift","umbrella","star","sun","globe"];
const SAV_COLORS = ["#2B7FFF","#06D6A0","#FFD166","#C77DFF","#FF6B6B","#4CC9F0","#FB8500","#8AC926","#F72585","#FF4D6D"];

interface SavingsForm {
  name: string; type: "savings" | "investment"; currentAmount: string;
  goalAmount: string; notes: string; color: string; icon: string;
}
const DEFAULT_SAV_FORM: SavingsForm = {
  name: "", type: "savings", currentAmount: "", goalAmount: "",
  notes: "", color: SAV_COLORS[0], icon: SAV_ICONS[0],
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function FinanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    expenses, addExpense, updateExpense, deleteExpense, reorderExpense,
    savingsPots, addSavingsPot, updateSavingsPot, deleteSavingsPot,
    currency,
  } = useApp();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 100;

  // ── Active sub-tab ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"expenses" | "savings">("expenses");

  // ── Expenses state ──────────────────────────────────────────────────────────
  const [showExpModal, setShowExpModal] = useState(false);
  const [editExpId, setEditExpId] = useState<string | null>(null);
  const [expForm, setExpForm] = useState<ExpenseForm>(DEFAULT_EXP_FORM);
  const [filter, setFilter] = useState<"all" | ExpenseCategory>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sortedExpenses = [...expenses]
    .sort((a, b) => a.priority - b.priority)
    .filter((e) => filter === "all" || e.category === filter);
  const totalMonthly = sortedExpenses.reduce((sum, e) => sum + toMonthly(e.amount, e.frequency), 0);

  function openAddExp() { setExpForm(DEFAULT_EXP_FORM); setEditExpId(null); setShowExpModal(true); }
  function openEditExp(item: ExpenseItem) {
    setExpForm({ name: item.name, amount: item.amount.toString(), category: item.category,
      frequency: item.frequency, notes: item.notes, color: item.color, icon: item.icon });
    setEditExpId(item.id); setShowExpModal(true);
  }
  function handleSaveExp() {
    if (!expForm.name.trim() || !expForm.amount) return;
    const amt = parseFloat(expForm.amount);
    if (isNaN(amt) || amt <= 0) return;
    if (editExpId) {
      updateExpense(editExpId, { name: expForm.name.trim(), amount: amt, category: expForm.category,
        frequency: expForm.frequency, notes: expForm.notes, color: expForm.color, icon: expForm.icon });
    } else {
      addExpense({ name: expForm.name.trim(), amount: amt, category: expForm.category,
        frequency: expForm.frequency, notes: expForm.notes, color: expForm.color, icon: expForm.icon });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowExpModal(false);
  }
  function handleDeleteExp(id: string) {
    Alert.alert("Delete", "Remove this item?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        deleteExpense(id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }},
    ]);
  }

  // ── Savings state ───────────────────────────────────────────────────────────
  const [showSavModal, setShowSavModal] = useState(false);
  const [editSavId, setEditSavId] = useState<string | null>(null);
  const [savForm, setSavForm] = useState<SavingsForm>(DEFAULT_SAV_FORM);
  const [depositId, setDepositId] = useState<string | null>(null);
  const [depositAmt, setDepositAmt] = useState("");

  const totalSaved = savingsPots.reduce((sum, p) => sum + p.currentAmount, 0);
  const totalGoal = savingsPots.reduce((sum, p) => sum + p.goalAmount, 0);

  function openAddSav() { setSavForm(DEFAULT_SAV_FORM); setEditSavId(null); setShowSavModal(true); }
  function openEditSav(pot: SavingsPot) {
    setSavForm({ name: pot.name, type: pot.type, currentAmount: pot.currentAmount.toString(),
      goalAmount: pot.goalAmount.toString(), notes: pot.notes, color: pot.color, icon: pot.icon });
    setEditSavId(pot.id); setShowSavModal(true);
  }
  function handleSaveSav() {
    if (!savForm.name.trim()) return;
    const current = parseFloat(savForm.currentAmount) || 0;
    const goal = parseFloat(savForm.goalAmount) || 0;
    if (editSavId) {
      updateSavingsPot(editSavId, { name: savForm.name.trim(), type: savForm.type,
        currentAmount: current, goalAmount: goal, notes: savForm.notes, color: savForm.color, icon: savForm.icon });
    } else {
      addSavingsPot({ name: savForm.name.trim(), type: savForm.type,
        currentAmount: current, goalAmount: goal, notes: savForm.notes, color: savForm.color, icon: savForm.icon });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowSavModal(false);
  }
  function handleDeleteSav(id: string) {
    Alert.alert("Delete", "Remove this pot?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        deleteSavingsPot(id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }},
    ]);
  }
  function handleDeposit(pot: SavingsPot) {
    const amt = parseFloat(depositAmt);
    if (isNaN(amt) || amt <= 0) return;
    updateSavingsPot(pot.id, { currentAmount: pot.currentAmount + amt });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDepositId(null); setDepositAmt("");
  }

  // ── Render helpers ──────────────────────────────────────────────────────────
  function renderExpenseItem({ item, index }: { item: ExpenseItem; index: number }) {
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
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.frequency}</Text>
              )}
            </View>
          </View>
          <View style={styles.cardRight}>
            <Text style={[styles.cardAmount, { color: colors.foreground }]}>{currency}{item.amount.toFixed(2)}</Text>
            <Text style={[styles.cardMonthly, { color: colors.mutedForeground }]}>{currency}{monthly.toFixed(2)}/mo</Text>
          </View>
        </View>
        {expanded && (
          <View style={[styles.expanded, { borderTopColor: colors.border }]}>
            {item.notes.trim() ? (
              <Text style={[styles.notesText, { color: colors.mutedForeground }]}>{item.notes}</Text>
            ) : null}
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border }]}
                onPress={() => reorderExpense(item.id, "up")} disabled={index === 0}>
                <Feather name="arrow-up" size={16} color={index === 0 ? colors.mutedForeground : colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border }]}
                onPress={() => reorderExpense(item.id, "down")} disabled={index === sortedExpenses.length - 1}>
                <Feather name="arrow-down" size={16} color={index === sortedExpenses.length - 1 ? colors.mutedForeground : colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border }]} onPress={() => openEditExp(item)}>
                <Feather name="edit-2" size={16} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.destructive + "40" }]} onPress={() => handleDeleteExp(item.id)}>
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  function renderSavingsPot({ item }: { item: SavingsPot }) {
    const progress = item.goalAmount > 0 ? Math.min(item.currentAmount / item.goalAmount, 1) : 0;
    const remaining = Math.max(item.goalAmount - item.currentAmount, 0);
    const isDepositing = depositId === item.id;
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardTop}>
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
          <View style={styles.savActions}>
            <TouchableOpacity onPress={() => openEditSav(item)} style={styles.iconBtn}>
              <Feather name="edit-2" size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteSav(item.id)} style={styles.iconBtn}>
              <Feather name="trash-2" size={15} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.amounts}>
          <View>
            <Text style={[styles.currentAmt, { color: colors.foreground }]}>{currency}{item.currentAmount.toLocaleString()}</Text>
            <Text style={[styles.goalAmt, { color: colors.mutedForeground }]}>of {currency}{item.goalAmount.toLocaleString()} goal</Text>
          </View>
          <Text style={[styles.pct, { color: item.color }]}>{(progress * 100).toFixed(0)}%</Text>
        </View>
        <View style={[styles.track, { backgroundColor: colors.muted }]}>
          <View style={[styles.fill, { width: `${progress * 100}%` as any, backgroundColor: item.color }]} />
        </View>
        {remaining > 0 && (
          <Text style={[styles.remaining, { color: colors.mutedForeground }]}>{currency}{remaining.toLocaleString()} remaining</Text>
        )}
        {item.notes.trim() ? (
          <Text style={[styles.savNotes, { color: colors.mutedForeground }]}>{item.notes}</Text>
        ) : null}
        {isDepositing ? (
          <View style={styles.depositRow}>
            <TextInput
              style={[styles.depositInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              value={depositAmt} onChangeText={setDepositAmt}
              placeholder="Amount" placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad" autoFocus
            />
            <TouchableOpacity style={[styles.depositBtn, { backgroundColor: colors.primary }]} onPress={() => handleDeposit(item)}>
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

  // ── Main render ─────────────────────────────────────────────────────────────
  const subtitle = activeTab === "expenses"
    ? `${currency}${totalMonthly.toFixed(2)}/month`
    : `${currency}${totalSaved.toLocaleString()} saved`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Finance</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={activeTab === "expenses" ? openAddExp : openAddSav}
        >
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Segmented control */}
      <View style={[styles.segmentRow, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.segmentTrack, { backgroundColor: colors.muted }]}>
          {(["expenses", "savings"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.segmentBtn, activeTab === tab && { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 }]}
              onPress={() => setActiveTab(tab)}
            >
              <Feather
                name={tab === "expenses" ? "credit-card" : "trending-up"}
                size={14}
                color={activeTab === tab ? colors.primary : colors.mutedForeground}
              />
              <Text style={[styles.segmentText, { color: activeTab === tab ? colors.primary : colors.mutedForeground, fontFamily: activeTab === tab ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
                {tab === "expenses" ? "Expenses" : "Savings"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Expenses tab ── */}
      {activeTab === "expenses" && (
        <>
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
            data={sortedExpenses}
            keyExtractor={(item) => item.id}
            renderItem={renderExpenseItem}
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: bottomPad }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Feather name="credit-card" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No expenses yet</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Tap + to add a subscription or expense</Text>
              </View>
            }
          />
        </>
      )}

      {/* ── Savings tab ── */}
      {activeTab === "savings" && (
        <>
          {savingsPots.length > 0 && (
            <View style={[styles.summary, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <View style={[styles.summaryTrack, { backgroundColor: colors.muted }]}>
                <View style={[styles.summaryFill, { width: `${totalGoal > 0 ? Math.min(totalSaved / totalGoal, 1) * 100 : 0}%` as any, backgroundColor: colors.primary }]} />
              </View>
              <Text style={[styles.summaryText, { color: colors.mutedForeground }]}>
                {currency}{totalSaved.toLocaleString()} / {currency}{totalGoal.toLocaleString()} overall goal
              </Text>
            </View>
          )}
          <FlatList
            data={savingsPots}
            keyExtractor={(item) => item.id}
            renderItem={renderSavingsPot}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomPad }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Feather name="trending-up" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No savings pots</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Create a pot to track your savings or investments</Text>
              </View>
            }
          />
        </>
      )}

      {/* ── Expenses modal ── */}
      <Modal visible={showExpModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowExpModal(false)}>
                <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editExpId ? "Edit" : "Add"} Item</Text>
              <TouchableOpacity onPress={handleSaveExp}>
                <Text style={[styles.modalSave, { color: colors.primary }]}>Save</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Name</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={expForm.name} onChangeText={(t) => setExpForm((f) => ({ ...f, name: t }))}
                placeholder="e.g. Netflix" placeholderTextColor={colors.mutedForeground} />

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Amount ({currency})</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={expForm.amount} onChangeText={(t) => setExpForm((f) => ({ ...f, amount: t }))}
                placeholder="0.00" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" />

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Category</Text>
              <View style={styles.pillRow}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity key={c.key}
                    style={[styles.pill, { borderColor: colors.border, backgroundColor: expForm.category === c.key ? colors.primary : colors.card }]}
                    onPress={() => setExpForm((f) => ({ ...f, category: c.key }))}>
                    <Text style={[styles.pillText, { color: expForm.category === c.key ? "#fff" : colors.foreground }]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                {expForm.category === "subscription" ? "Billing Cycle (Recurring)" : "Frequency"}
              </Text>
              <View style={styles.pillRow}>
                {FREQUENCIES.map((f) => (
                  <TouchableOpacity key={f}
                    style={[styles.pill, { borderColor: colors.border, backgroundColor: expForm.frequency === f ? colors.primary : colors.card }]}
                    onPress={() => setExpForm((frm) => ({ ...frm, frequency: f }))}>
                    <Text style={[styles.pillText, { color: expForm.frequency === f ? "#fff" : colors.foreground }]}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Icon</Text>
              <View style={styles.iconGrid}>
                {EXP_ICONS.map((ic) => (
                  <TouchableOpacity key={ic}
                    style={[styles.iconOption, { backgroundColor: expForm.icon === ic ? expForm.color + "33" : colors.card, borderColor: expForm.icon === ic ? expForm.color : colors.border }]}
                    onPress={() => setExpForm((f) => ({ ...f, icon: ic }))}>
                    <Feather name={ic as any} size={20} color={expForm.icon === ic ? expForm.color : colors.mutedForeground} />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Color</Text>
              <View style={styles.colorRow}>
                {EXP_COLORS.map((c) => (
                  <TouchableOpacity key={c}
                    style={[styles.colorDot, { backgroundColor: c, borderWidth: expForm.color === c ? 3 : 0, borderColor: "#fff" }]}
                    onPress={() => setExpForm((f) => ({ ...f, color: c }))} />
                ))}
              </View>

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Notes</Text>
              <TextInput style={[styles.input, styles.notesInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={expForm.notes} onChangeText={(t) => setExpForm((f) => ({ ...f, notes: t }))}
                placeholder="Optional notes..." placeholderTextColor={colors.mutedForeground} multiline numberOfLines={3} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Savings modal ── */}
      <Modal visible={showSavModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowSavModal(false)}>
                <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editSavId ? "Edit" : "New"} Pot</Text>
              <TouchableOpacity onPress={handleSaveSav}>
                <Text style={[styles.modalSave, { color: colors.primary }]}>Save</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Name</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={savForm.name} onChangeText={(t) => setSavForm((f) => ({ ...f, name: t }))}
                placeholder="e.g. Holiday Fund" placeholderTextColor={colors.mutedForeground} />

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Type</Text>
              <View style={styles.pillRow}>
                {(["savings", "investment"] as const).map((t) => (
                  <TouchableOpacity key={t}
                    style={[styles.pill, { borderColor: colors.border, backgroundColor: savForm.type === t ? colors.primary : colors.card }]}
                    onPress={() => setSavForm((f) => ({ ...f, type: t }))}>
                    <Text style={[styles.pillText, { color: savForm.type === t ? "#fff" : colors.foreground }]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Current Amount ({currency})</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={savForm.currentAmount} onChangeText={(t) => setSavForm((f) => ({ ...f, currentAmount: t }))}
                placeholder="0" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" />

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Goal Amount ({currency})</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={savForm.goalAmount} onChangeText={(t) => setSavForm((f) => ({ ...f, goalAmount: t }))}
                placeholder="0" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" />

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Icon</Text>
              <View style={styles.iconGrid}>
                {SAV_ICONS.map((ic) => (
                  <TouchableOpacity key={ic}
                    style={[styles.iconOption, { backgroundColor: savForm.icon === ic ? savForm.color + "33" : colors.card, borderColor: savForm.icon === ic ? savForm.color : colors.border }]}
                    onPress={() => setSavForm((f) => ({ ...f, icon: ic }))}>
                    <Feather name={ic as any} size={20} color={savForm.icon === ic ? savForm.color : colors.mutedForeground} />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Color</Text>
              <View style={styles.colorRow}>
                {SAV_COLORS.map((c) => (
                  <TouchableOpacity key={c}
                    style={[styles.colorDot, { backgroundColor: c, borderWidth: savForm.color === c ? 3 : 0, borderColor: "#fff" }]}
                    onPress={() => setSavForm((f) => ({ ...f, color: c }))} />
                ))}
              </View>

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Notes</Text>
              <TextInput style={[styles.input, styles.notesInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={savForm.notes} onChangeText={(t) => setSavForm((f) => ({ ...f, notes: t }))}
                placeholder="Optional notes..." placeholderTextColor={colors.mutedForeground} multiline numberOfLines={3} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  segmentRow: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  segmentTrack: { flexDirection: "row", borderRadius: 12, padding: 3, gap: 2 },
  segmentBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: 10 },
  segmentText: { fontSize: 13 },
  filterRow: { flexDirection: "row", borderBottomWidth: 1 },
  filterTab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  filterText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  summary: { paddingHorizontal: 20, paddingVertical: 12, gap: 6, borderBottomWidth: 1 },
  summaryTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  summaryFill: { height: "100%", borderRadius: 2 },
  summaryText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  cardTop: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1, gap: 4 },
  cardName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
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
  savActions: { flexDirection: "row", gap: 4 },
  iconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  amounts: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 14, paddingBottom: 6 },
  currentAmt: { fontSize: 22, fontFamily: "Inter_700Bold" },
  goalAmt: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  pct: { fontSize: 20, fontFamily: "Inter_700Bold" },
  track: { height: 8, borderRadius: 4, overflow: "hidden", marginHorizontal: 14 },
  fill: { height: "100%", borderRadius: 4 },
  remaining: { fontSize: 12, fontFamily: "Inter_400Regular", paddingHorizontal: 14 },
  savNotes: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic", paddingHorizontal: 14 },
  depositRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingBottom: 10, marginTop: 4 },
  depositInput: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  depositBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  depositBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  depositTrigger: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginHorizontal: 14, marginBottom: 10, marginTop: 4 },
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
