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

const EXPENSE_ICONS = ["credit-card", "wifi", "tv", "music", "cloud", "smartphone", "home", "shopping-bag", "zap", "coffee", "truck", "heart"];
const EXPENSE_COLORS = ["#2B7FFF", "#06D6A0", "#FF6B6B", "#FFD166", "#C77DFF", "#F72585", "#4CC9F0", "#FB8500", "#8AC926", "#FF4D6D"];
const SAVINGS_ICONS = ["target", "home", "briefcase", "trending-up", "heart", "gift", "umbrella", "star", "sun", "globe"];

function pickIcon(name: string, type: "expense" | "savings"): string {
  const n = name.toLowerCase();
  if (type === "expense") {
    if (n.includes("netflix") || n.includes("tv") || n.includes("hulu") || n.includes("disney")) return "tv";
    if (n.includes("spotify") || n.includes("music") || n.includes("apple music")) return "music";
    if (n.includes("wifi") || n.includes("internet") || n.includes("broadband")) return "wifi";
    if (n.includes("phone") || n.includes("mobile")) return "smartphone";
    if (n.includes("rent") || n.includes("mortgage") || n.includes("home")) return "home";
    if (n.includes("cloud") || n.includes("icloud") || n.includes("drive")) return "cloud";
    if (n.includes("coffee") || n.includes("starbucks")) return "coffee";
    if (n.includes("gym") || n.includes("health") || n.includes("fitness")) return "heart";
    return EXPENSE_ICONS[Math.abs(name.charCodeAt(0)) % EXPENSE_ICONS.length];
  }
  if (n.includes("house") || n.includes("home") || n.includes("property")) return "home";
  if (n.includes("holiday") || n.includes("travel") || n.includes("vacation")) return "sun";
  if (n.includes("invest") || n.includes("stock") || n.includes("fund")) return "trending-up";
  if (n.includes("emergency") || n.includes("rainy")) return "umbrella";
  if (n.includes("gift") || n.includes("christmas") || n.includes("present")) return "gift";
  return SAVINGS_ICONS[Math.abs(name.charCodeAt(0)) % SAVINGS_ICONS.length];
}

function pickColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return EXPENSE_COLORS[Math.abs(hash) % EXPENSE_COLORS.length];
}

type AiCtx = {
  expenses: { name: string; amount: number; frequency: string; category: string }[];
  savingsPots: { name: string; type: string; currentAmount: number; goalAmount: number }[];
  journalCount: number;
  recentMoods: number[];
  currency: string;
  profileName?: string;
  financialGoal?: string;
};

function buildSystemPrompt(ctx: AiCtx): string {
  const { currency } = ctx;
  const today = new Date().toISOString().split("T")[0];
  const expensesList = ctx.expenses.length
    ? ctx.expenses.map((e) => `- ${e.name}: ${currency}${e.amount} ${e.frequency} (${e.category})`).join("\n")
    : "None yet";
  const savingsList = ctx.savingsPots.length
    ? ctx.savingsPots.map((p) => `- ${p.name}: ${currency}${p.currentAmount} saved of ${currency}${p.goalAmount} goal`).join("\n")
    : "None yet";
  const moodSummary = ctx.recentMoods.length
    ? `Recent moods: ${ctx.recentMoods.join(", ")} (1=Awful, 5=Great)`
    : "No journal entries yet";
  return `You are a friendly, concise financial and wellbeing assistant in the Finance & Journal app.
${ctx.profileName ? `User's name: ${ctx.profileName}.` : ""}Currency: ${currency}. Today: ${today}.
${ctx.financialGoal ? `User's financial goal: "${ctx.financialGoal}".` : ""}

User data:
EXPENSES & SUBSCRIPTIONS:
${expensesList}

SAVINGS & INVESTMENTS:
${savingsList}

JOURNAL: ${ctx.journalCount} entries. ${moodSummary}

Always respond with valid JSON in this exact format:
{"reply":"your response","action":null}
OR when taking an action:
{"reply":"confirmation","action":{"type":"action_name","payload":{...}}}

Available actions:
- add_expense: payload {name,amount,category("subscription"|"expense"),frequency("daily"|"weekly"|"monthly"|"yearly"),notes}
- add_savings_pot: payload {name,type("savings"|"investment"),currentAmount,goalAmount,notes}
- add_journal_entry: payload {title,content,mood(1-5),date(YYYY-MM-DD)}
- update_savings_amount: payload {potName,newAmount}

Keep replies concise and friendly. Use ${currency} for amounts.`;
}

function applyActionDefaults(parsed: { reply?: string; action?: { type: string; payload: Record<string, unknown> } | null }): { reply: string; action?: ActionPayload } {
  const today = new Date().toISOString().split("T")[0];
  const action = parsed.action ?? null;
  if (action) {
    const { type, payload } = action;
    if (type === "add_expense") {
      payload.icon = pickIcon(String(payload.name ?? ""), "expense");
      payload.color = pickColor(String(payload.name ?? ""));
      payload.notes = payload.notes ?? "";
    } else if (type === "add_savings_pot") {
      payload.icon = pickIcon(String(payload.name ?? ""), "savings");
      payload.color = pickColor(String(payload.name ?? ""));
      payload.notes = payload.notes ?? "";
    } else if (type === "add_journal_entry") {
      payload.date = payload.date ?? today;
      payload.title = payload.title ?? "";
    }
  }
  return { reply: parsed.reply ?? "I'm not sure how to help with that.", action: action ?? undefined };
}

async function callGemini(apiKey: string, msgs: Message[], ctx: AiCtx): Promise<{ reply: string; action?: ActionPayload }> {
  const systemPrompt = buildSystemPrompt(ctx);
  const contents = msgs.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(errBody?.error?.message ?? `Gemini error ${res.status}`);
  }
  const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{"reply":"I\'m not sure how to help with that.","action":null}';
  return applyActionDefaults(JSON.parse(text));
}

async function callGroq(apiKey: string, msgs: Message[], ctx: AiCtx): Promise<{ reply: string; action?: ActionPayload }> {
  const systemPrompt = buildSystemPrompt(ctx);
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...msgs,
      ],
      response_format: { type: "json_object" },
      max_tokens: 1024,
    }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(errBody?.error?.message ?? `Groq error ${res.status}`);
  }
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const text = data?.choices?.[0]?.message?.content ?? '{"reply":"I\'m not sure how to help with that.","action":null}';
  return applyActionDefaults(JSON.parse(text));
}

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
  const { expenses, savingsPots, journalEntries, currency, addExpense, addSavingsPot, addJournalEntry, updateSavingsPot, geminiApiKey, profileName, financialGoal } = useApp();

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
      if (!geminiApiKey) {
        setMessages((prev) => [...prev, { role: "assistant", content: "Please add your free Gemini API key in Settings → AI Assistant to get started. You can get one for free at aistudio.google.com" }]);
        return;
      }

      const aiCtx = {
        expenses: expenses.map((e) => ({ name: e.name, amount: e.amount, frequency: e.frequency, category: e.category })),
        savingsPots: savingsPots.map((p) => ({ name: p.name, type: p.type, currentAmount: p.currentAmount, goalAmount: p.goalAmount })),
        journalCount: journalEntries.length,
        recentMoods: journalEntries.slice(0, 5).map((j) => j.mood),
        currency,
        profileName,
        financialGoal,
      };
      const result = geminiApiKey.startsWith("gsk_")
        ? await callGroq(geminiApiKey, newMessages, aiCtx)
        : await callGemini(geminiApiKey, newMessages, aiCtx);

      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
      if (result.action) setPendingAction(result.action);
      Haptics.selectionAsync();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => [...prev, { role: "assistant", content: `Sorry, something went wrong: ${msg}` }]);
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
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {geminiApiKey
              ? `Powered by ${geminiApiKey.startsWith("gsk_") ? "Groq" : "Gemini"} ✓`
              : "Setup required"}
          </Text>
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
          {messages.length === 0 && geminiApiKey && (
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

          {messages.length === 0 && !geminiApiKey && (
            <View style={styles.emptyState}>
              <View style={[styles.aiAvatar, { backgroundColor: "#2B7FFF18" }]}>
                <Feather name="zap" size={28} color="#2B7FFF" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Set up AI Assistant</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Add a free Google Gemini API key to enable your personal financial assistant. No credit card required.
              </Text>
              <TouchableOpacity
                style={[styles.setupBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/(tabs)/settings")}
              >
                <Feather name="settings" size={16} color="#fff" />
                <Text style={styles.setupBtnText}>Open Settings</Text>
              </TouchableOpacity>
              <Text style={[styles.setupHint, { color: colors.mutedForeground }]}>Free key at aistudio.google.com</Text>
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
  setupBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  setupBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  setupHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 8 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular", maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", flexShrink: 0 },
});
