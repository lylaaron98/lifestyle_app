import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Linking,
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

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const PROFILE_EMOJIS = ["😊", "😎", "🦊", "🐱", "🦁", "🐼", "🦋", "🌟", "💎", "🚀", "🎯", "🏆", "🌈", "🔥", "⚡", "🌸", "🎸", "🧠", "🎨", "🌴"];

const CURRENCIES = [
  { symbol: "£", label: "GBP - British Pound" },
  { symbol: "$", label: "USD - US Dollar" },
  { symbol: "€", label: "EUR - Euro" },
  { symbol: "S$", label: "SGD - Singapore Dollar" },
  { symbol: "¥", label: "JPY - Japanese Yen" },
  { symbol: "₹", label: "INR - Indian Rupee" },
  { symbol: "A$", label: "AUD - Australian Dollar" },
  { symbol: "C$", label: "CAD - Canadian Dollar" },
  { symbol: "CHF", label: "CHF - Swiss Franc" },
  { symbol: "kr", label: "SEK - Swedish Krona" },
];

interface RowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  last?: boolean;
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currency, setCurrency, expenses, savingsPots, journalEntries, geminiApiKey, setGeminiApiKey,
    profileName, profileEmoji, weekStart, financialGoal,
    setProfileName, setProfileEmoji, setWeekStart, setFinancialGoal,
    colorScheme, setColorScheme } = useApp();
  const [showCurrency, setShowCurrency] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [goalSaved, setGoalSaved] = useState(false);

  useEffect(() => { setApiKeyInput(geminiApiKey); }, [geminiApiKey]);
  useEffect(() => { setNameInput(profileName); }, [profileName]);
  useEffect(() => { setGoalInput(financialGoal); }, [financialGoal]);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 100;

  function Row({ icon, label, value, onPress, destructive, last }: RowProps) {
    return (
      <TouchableOpacity
        style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
        disabled={!onPress}
      >
        <View style={[styles.rowIcon, { backgroundColor: destructive ? colors.destructive + "18" : colors.accent }]}>
          <Feather name={icon as any} size={16} color={destructive ? colors.destructive : colors.accentForeground} />
        </View>
        <Text style={[styles.rowLabel, { color: destructive ? colors.destructive : colors.foreground }]}>{label}</Text>
        {value ? <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text> : null}
        {onPress && !destructive ? <Feather name="chevron-right" size={16} color={colors.mutedForeground} /> : null}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad }}>
        {/* Profile */}
        <Text style={[styles.section, { color: colors.mutedForeground }]}>Profile</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.profileRow, { borderBottomWidth: showEmojiPicker ? StyleSheet.hairlineWidth : 0, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.avatarBtn, { backgroundColor: colors.accent, borderColor: showEmojiPicker ? colors.primary : colors.border }]}
              onPress={() => setShowEmojiPicker((v) => !v)}
            >
              <Text style={styles.avatarText}>{profileEmoji}</Text>
            </TouchableOpacity>
            <View style={styles.nameInputWrap}>
              <TextInput
                style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                value={nameInput}
                onChangeText={(v) => { setNameInput(v); setNameSaved(false); }}
                placeholder="Your name"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
              />
            </View>
            <TouchableOpacity
              style={[styles.saveKeyBtn, { backgroundColor: nameSaved ? "#06D6A0" : colors.primary }]}
              onPress={async () => { await setProfileName(nameInput.trim()); setNameSaved(true); }}
            >
              <Text style={styles.saveKeyText}>{nameSaved ? "✓" : "Save"}</Text>
            </TouchableOpacity>
          </View>
          {showEmojiPicker && (
            <View style={styles.emojiGrid}>
              {PROFILE_EMOJIS.map((em) => (
                <TouchableOpacity
                  key={em}
                  style={[styles.emojiBtn, profileEmoji === em && { backgroundColor: colors.primary + "22", borderRadius: 8 }]}
                  onPress={() => { setProfileEmoji(em); setShowEmojiPicker(false); }}
                >
                  <Text style={styles.emojiText}>{em}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Appearance */}
        <Text style={[styles.section, { color: colors.mutedForeground }]}>Appearance</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.accent }]}>
              <Feather name="sun" size={16} color={colors.accentForeground} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Theme</Text>
            <View style={styles.themeToggle}>
              {(["light", "system", "dark"] as const).map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.themeBtn, {
                    backgroundColor: colorScheme === val ? colors.primary : colors.background,
                    borderColor: colorScheme === val ? colors.primary : colors.border,
                  }]}
                  onPress={() => setColorScheme(val)}
                >
                  <Feather
                    name={val === "light" ? "sun" : val === "dark" ? "moon" : "monitor"}
                    size={13}
                    color={colorScheme === val ? "#fff" : colors.mutedForeground}
                  />
                  <Text style={[styles.themeBtnText, { color: colorScheme === val ? "#fff" : colors.mutedForeground }]}>
                    {val.charAt(0).toUpperCase() + val.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Preferences */}
        <Text style={[styles.section, { color: colors.mutedForeground }]}>Preferences</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row
            icon="dollar-sign"
            label="Currency"
            value={currency}
            onPress={() => setShowCurrency(true)}
          />
          <View style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.accent }]}>
              <Feather name="calendar" size={16} color={colors.accentForeground} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Week starts on</Text>
            <View style={styles.weekToggle}>
              {(["mon", "sun"] as const).map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.weekBtn, { backgroundColor: weekStart === d ? colors.primary : colors.background, borderColor: colors.border, borderWidth: 1 }]}
                  onPress={() => setWeekStart(d)}
                >
                  <Text style={[styles.weekBtnText, { color: weekStart === d ? "#fff" : colors.mutedForeground }]}>
                    {d === "mon" ? "Mon" : "Sun"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={[styles.apiKeyRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.accent }]}>
              <Feather name="target" size={16} color={colors.accentForeground} />
            </View>
            <View style={styles.apiKeyInputWrap}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>Financial Goal</Text>
              <TextInput
                style={[styles.apiKeyInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                value={goalInput}
                onChangeText={(v) => { setGoalInput(v); setGoalSaved(false); }}
                placeholder="e.g. Save £10,000 by Dec 2026"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="sentences"
                returnKeyType="done"
              />
            </View>
            <TouchableOpacity
              style={[styles.saveKeyBtn, { backgroundColor: goalSaved ? "#06D6A0" : colors.primary, alignSelf: "flex-end" }]}
              onPress={async () => { await setFinancialGoal(goalInput.trim()); setGoalSaved(true); }}
            >
              <Text style={styles.saveKeyText}>{goalSaved ? "✓" : "Save"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <Text style={[styles.section, { color: colors.mutedForeground }]}>Your Data</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row icon="credit-card" label="Expenses & Subscriptions" value={`${expenses.length} items`} />
          <Row icon="trending-up" label="Savings Pots" value={`${savingsPots.length} pots`} />
          <Row icon="book-open" label="Journal Entries" value={`${journalEntries.length} entries`} last />
        </View>

        {/* AI Assistant */}
        <Text style={[styles.section, { color: colors.mutedForeground }]}>AI Assistant</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.apiKeyRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.accent }]}>
              <Feather name="cpu" size={16} color={colors.accentForeground} />
            </View>
            <View style={styles.apiKeyInputWrap}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>AI API Key</Text>
              <TextInput
                style={[styles.apiKeyInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                value={apiKeyInput}
                onChangeText={(v) => { setApiKeyInput(v); setKeySaved(false); }}
                secureTextEntry={!showApiKey}
                placeholder="Gemini or Groq API key"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity onPress={() => setShowApiKey((v) => !v)} style={styles.eyeBtn}>
              <Feather name={showApiKey ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <View style={styles.apiKeyActions}>
            <View style={{ gap: 2 }}>
              <TouchableOpacity onPress={() => Linking.openURL("https://console.groq.com/keys")}>
                <Text style={[styles.apiKeyLink, { color: colors.primary }]}>Free Groq key (no card) ↗</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Linking.openURL("https://aistudio.google.com/apikey")}>
                <Text style={[styles.apiKeyLink, { color: colors.mutedForeground }]}>Gemini key (aistudio.google.com) ↗</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.saveKeyBtn, { backgroundColor: keySaved ? "#06D6A0" : colors.primary }]}
              onPress={async () => { await setGeminiApiKey(apiKeyInput.trim()); setKeySaved(true); }}
            >
              <Text style={styles.saveKeyText}>{keySaved ? "Saved ✓" : "Save"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* About */}
        <Text style={[styles.section, { color: colors.mutedForeground }]}>About</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row icon="info" label="Version" value="1.0.0" />
          <Row icon="lock" label="Privacy" value="All data stored locally" last />
        </View>

        <View style={styles.footer}>
          <View style={[styles.footerIconWrap, { backgroundColor: "#2B7FFF18" }]}>
            <Feather name="zap" size={22} color="#2B7FFF" />
          </View>
          <Text style={[styles.footerTitle, { color: colors.foreground }]}>Finance & Journal</Text>
          <Text style={[styles.footerSub, { color: colors.mutedForeground }]}>
            Track your finances, savings, and wellbeing — all in one place. Your data never leaves your device.
          </Text>
        </View>
      </ScrollView>

      {/* Currency picker modal */}
      <Modal visible={showCurrency} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowCurrency(false)}>
              <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Currency</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
            {CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c.symbol}
                style={[styles.currencyRow, { backgroundColor: currency === c.symbol ? colors.primary + "18" : colors.card, borderColor: currency === c.symbol ? colors.primary : colors.border }]}
                onPress={() => { setCurrency(c.symbol); setShowCurrency(false); }}
              >
                <Text style={[styles.currencySymbol, { color: currency === c.symbol ? colors.primary : colors.foreground }]}>
                  {c.symbol}
                </Text>
                <Text style={[styles.currencyLabel, { color: currency === c.symbol ? colors.primary : colors.foreground }]}>
                  {c.label}
                </Text>
                {currency === c.symbol && <Feather name="check" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, gap: 12 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  section: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  group: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  rowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  rowValue: { fontSize: 14, fontFamily: "Inter_400Regular" },
  footer: { alignItems: "center", padding: 32, gap: 10 },
  footerIconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  footerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  footerSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, maxWidth: 280 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  modalCancel: { fontSize: 15, fontFamily: "Inter_400Regular", width: 60 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  currencyRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  currencySymbol: { fontSize: 18, fontFamily: "Inter_700Bold", width: 40 },
  currencyLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  apiKeyRow: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  apiKeyInputWrap: { flex: 1 },
  apiKeyInput: { marginTop: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, fontFamily: "Inter_400Regular" },
  eyeBtn: { paddingTop: 4 },
  apiKeyActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10 },
  apiKeyLink: { fontSize: 12, fontFamily: "Inter_400Regular" },
  saveKeyBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  saveKeyText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  profileRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  avatarBtn: { width: 52, height: 52, borderRadius: 16, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 26 },
  nameInputWrap: { flex: 1 },
  nameInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_500Medium" },
  emojiGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  emojiBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  emojiText: { fontSize: 24 },
  weekToggle: { flexDirection: "row", gap: 6 },
  weekBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  weekBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  themeToggle: { flexDirection: "row", gap: 5 },
  themeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  themeBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
