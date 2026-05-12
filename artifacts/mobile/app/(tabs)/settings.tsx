import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Modal,
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
  const { currency, setCurrency, expenses, savingsPots, journalEntries } = useApp();
  const [showCurrency, setShowCurrency] = useState(false);

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
        {/* Preferences */}
        <Text style={[styles.section, { color: colors.mutedForeground }]}>Preferences</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row
            icon="dollar-sign"
            label="Currency"
            value={currency}
            onPress={() => setShowCurrency(true)}
            last
          />
        </View>

        {/* Stats */}
        <Text style={[styles.section, { color: colors.mutedForeground }]}>Your Data</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row icon="credit-card" label="Expenses & Subscriptions" value={`${expenses.length} items`} />
          <Row icon="trending-up" label="Savings Pots" value={`${savingsPots.length} pots`} />
          <Row icon="book-open" label="Journal Entries" value={`${journalEntries.length} entries`} last />
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
});
