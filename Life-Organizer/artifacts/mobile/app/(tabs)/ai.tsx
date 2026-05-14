import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ActionPayload {
  type: string;
  payload: Record<string, unknown>;
}

const STARTERS = [
  "Add Netflix £15.99/month subscription",
  "Create a Holiday savings pot, goal £2000",
  "How much am I spending monthly?",
  "Log a journal entry, feeling great today",
];

function ActionCard({
  action,
  onApply,
  onDismiss,
  colors,
  currency,
}: {
  action: ActionPayload;
  onApply: () => void;
  onDismiss: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  currency: string;
}) {
  const labels: Record<string, string> = {
    add_expense: "Add Expense",
    add_savings_pot: "Create Savings Pot",
    add_journal_entry: "Add Journal Entry",
    update_savings_amount: "Update Savings",
  };
  const icons: Record<string, string> = {
    add_expense: "credit-card",
    add_savings_pot: "trending-up",
    add_journal_entry: "book-open",
    update_savings_amount: "edit-2",
  };
  const label = labels[action.type] ?? action.type;
  const icon = icons[action.type] ?? "zap";
  const p = action.payload;

  return (
    <View style={[styles.actionCard, { backgroundColor: colors.accent, borderColor: colors.primary + "40" }]}>
      <View style={styles.actionCardHeader}>
        <View style={[styles.actionIcon, { backgroundColor: colors.primary + "22" }]}>
          <Feather name={icon as any} size={16} color={colors.primary} />
        </View>
        <Text style={[styles.actionLabel, { color: colors.primary }]}>{label}</Text>
      </View>
      <View style={styles.actionDetails}>
        {p.name ? <Text style={[styles.actionDetail, { color: colors.foreground }]}><Text style={{ color: colors.mutedForeground }}>Name: </Text>{String(p.name)}</Text> : null}
        {p.amount != null ? <Text style={[styles.actionDetail, { color: colors.foreground }]}><Text style={{ color: colors.mutedForeground }}>Amount: </Text>{currency}{String(p.amount)}</Text> : null}
        {p.frequency ? <Text style={[styles.actionDetail, { color: colors.foreground }]}><Text style={{ color: colors.mutedForeground }}>Frequency: </Text>{String(p.frequency)}</Text> : null}
        {p.goalAmount != null ? <Text style={[styles.actionDetail, { color: colors.foreground }]}><Text style={{ color: colors.mutedForeground }}>Goal: </Text>{currency}{String(p.goalAmount)}</Text> : null}
        {p.mood != null ? <Text style={[styles.actionDetail, { color: colors.foreground }]}><Text style={{ color: colors.mutedForeground }}>Mood: </Text>{String(p.mood)}/5</Text> : null}
        {p.content ? <Text style={[styles.actionDetail, { color: colors.foreground }]} numberOfLines={2}><Text style={{ color: colors.mutedForeground }}>Content: </Text>{String(p.content)}</Text> : null}
      </View>
      <View style={styles.actionBtns}>
        <TouchableOpacity style={[styles.dismissBtn, { borderColor: colors.border }]} onPress={onDismiss}>
          <Text style={[styles.dismissText, { color: colors.mutedForeground }]}>Dismiss</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={onApply}>
          <Feather name="check" size={14} color="#fff" />
          <Text style={styles.applyText}>Apply</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AIScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { expenses, savingsPots, journalEntries, currency, addExpense, addSavingsPot, addJournalEntry, updateSavingsPot } = useApp();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<ActionPayload | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  async function sendMessage(text?: string) {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setPendingAction(null);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const apiBase = process.env.EXPO_PUBLIC_DOMAIN
        ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
        : "";

      const response = await fetch(`${apiBase}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          context: {
            expenses: expenses.map((e) => ({ name: e.name, amount: e.amount, frequency: e.frequency, category: e.category })),
            savingsPots: savingsPots.map((p) => ({ name: p.name, type: p.type, currentAmount: p.currentAmount, goalAmount: p.goalAmount })),
            journalCount: journalEntries.length,
            recentMoods: journalEntries.slice(0, 5).map((j) => j.mood),
            currency,
          },
        }),
      });

      if (!response.ok) throw new Error("API error");

      const data = await response.json() as { reply: string; action?: ActionPayload; error?: string };

      if (data.error) throw new Error(data.error);

      const assistantMsg: Message = { role: "assistant", content: data.reply };
      setMessages((prev) => [...prev, assistantMsg]);

      if (data.action) {
        setPendingAction(data.action);
      }

      Haptics.selectionAsync();
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't connect. Please check your connection and try again." }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  function applyAction() {
    if (!pendingAction) return;
    const { type, payload } = pendingAction;

    try {
      if (type === "add_expense") {
        addExpense({
          name: String(payload.name ?? ""),
          amount: Number(payload.amount ?? 0),
          category: (payload.category as any) ?? "expense",
          frequency: (payload.frequency as any) ?? "monthly",
          notes: String(payload.notes ?? ""),
          color: String(payload.color ?? "#2B7FFF"),
          icon: String(payload.icon ?? "credit-card"),
        });
      } else if (type === "add_savings_pot") {
        addSavingsPot({
          name: String(payload.name ?? ""),
          type: (payload.type as any) ?? "savings",
          currentAmount: Number(payload.currentAmount ?? 0),
          goalAmount: Number(payload.goalAmount ?? 0),
          notes: String(payload.notes ?? ""),
          color: String(payload.color ?? "#2B7FFF"),
          icon: String(payload.icon ?? "target"),
        });
      } else if (type === "add_journal_entry") {
        addJournalEntry({
          title: String(payload.title ?? ""),
          content: String(payload.content ?? ""),
          mood: (Number(payload.mood) as any) || 3,
          date: String(payload.date ?? new Date().toISOString().split("T")[0]),
        });
      } else if (type === "update_savings_amount") {
        const pot = savingsPots.find((p) => p.name.toLowerCase() === String(payload.potName ?? "").toLowerCase());
        if (pot) updateSavingsPot(pot.id, { currentAmount: Number(payload.newAmount ?? 0) });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMessages((prev) => [...prev, { role: "assistant", content: "Done! I've applied the change to your app." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong applying that change. Try doing it manually." }]);
    }
    setPendingAction(null);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>AI Assistant</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Powered by OpenAI</Text>
        </View>
        <TouchableOpacity style={[styles.settingsBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push("/(tabs)/settings")}>
          <Feather name="settings" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Empty state */}
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <View style={[styles.aiAvatar, { backgroundColor: "#2B7FFF18" }]}>
                <Feather name="zap" size={28} color="#2B7FFF" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                Hi! I'm your financial assistant.
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                I can add expenses, create savings pots, log journal entries, and answer questions about your finances.
              </Text>
              <View style={styles.starters}>
                {STARTERS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.starterChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => sendMessage(s)}
                  >
                    <Text style={[styles.starterText, { color: colors.foreground }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Messages */}
          {messages.map((m, i) => (
            <View key={i} style={m.role === "user" ? styles.userMsgRow : styles.asstMsgRow}>
              {m.role === "assistant" && (
                <View style={[styles.asstAvatar, { backgroundColor: "#2B7FFF22" }]}>
                  <Feather name="zap" size={12} color="#2B7FFF" />
                </View>
              )}
              <View
                style={[
                  styles.bubble,
                  m.role === "user"
                    ? { backgroundColor: colors.primary, alignSelf: "flex-end" }
                    : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, alignSelf: "flex-start" },
                ]}
              >
                <Text style={[styles.bubbleText, { color: m.role === "user" ? "#fff" : colors.foreground }]}>
                  {m.content}
                </Text>
              </View>
            </View>
          ))}

          {loading && (
            <View style={styles.asstMsgRow}>
              <View style={[styles.asstAvatar, { backgroundColor: "#2B7FFF22" }]}>
                <Feather name="zap" size={12} color="#2B7FFF" />
              </View>
              <View style={[styles.bubble, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            </View>
          )}

          {/* Action card */}
          {pendingAction && !loading && (
            <ActionCard
              action={pendingAction}
              onApply={applyAction}
              onDismiss={() => setPendingAction(null)}
              colors={colors}
              currency={currency}
            />
          )}
        </ScrollView>

        {/* Input */}
        <View style={[styles.inputRow, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomInset + 8 }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            value={input}
            onChangeText={setInput}
            placeholder="Ask me anything..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage()}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.muted }]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || loading}
          >
            <Feather name="send" size={18} color={input.trim() ? "#fff" : colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  settingsBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emptyState: { flex: 1, alignItems: "center", paddingTop: 40, gap: 12, paddingHorizontal: 8 },
  aiAvatar: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, maxWidth: 300 },
  starters: { gap: 8, width: "100%", marginTop: 8 },
  starterChip: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  starterText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  userMsgRow: { alignItems: "flex-end" },
  asstMsgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  asstAvatar: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bubble: { maxWidth: "82%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  actionCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  actionCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  actionDetails: { gap: 4 },
  actionDetail: { fontSize: 13, fontFamily: "Inter_400Regular" },
  actionBtns: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  dismissBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  dismissText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  applyBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  applyText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular", maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", flexShrink: 0 },
});
