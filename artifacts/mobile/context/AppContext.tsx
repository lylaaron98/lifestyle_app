import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type ExpenseFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type ExpenseCategory = "subscription" | "expense";

export interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  frequency: ExpenseFrequency;
  priority: number;
  notes: string;
  color: string;
  icon: string;
  createdAt: string;
}

export interface SavingsPot {
  id: string;
  name: string;
  type: "savings" | "investment";
  currentAmount: number;
  goalAmount: number;
  notes: string;
  color: string;
  icon: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: 1 | 2 | 3 | 4 | 5;
  date: string;
  createdAt: string;
}

interface AppContextType {
  expenses: ExpenseItem[];
  addExpense: (item: Omit<ExpenseItem, "id" | "createdAt" | "priority">) => void;
  updateExpense: (id: string, item: Partial<ExpenseItem>) => void;
  deleteExpense: (id: string) => void;
  reorderExpense: (id: string, direction: "up" | "down") => void;

  savingsPots: SavingsPot[];
  addSavingsPot: (pot: Omit<SavingsPot, "id" | "createdAt">) => void;
  updateSavingsPot: (id: string, pot: Partial<SavingsPot>) => void;
  deleteSavingsPot: (id: string) => void;

  journalEntries: JournalEntry[];
  addJournalEntry: (entry: Omit<JournalEntry, "id" | "createdAt">) => void;
  updateJournalEntry: (id: string, entry: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;

  currency: string;
  setCurrency: (c: string) => void;

  geminiApiKey: string;
  setGeminiApiKey: (key: string) => Promise<void>;

  profileName: string;
  profileEmoji: string;
  weekStart: "mon" | "sun";
  financialGoal: string;
  setProfileName: (v: string) => Promise<void>;
  setProfileEmoji: (v: string) => Promise<void>;
  setWeekStart: (v: "mon" | "sun") => Promise<void>;
  setFinancialGoal: (v: string) => Promise<void>;

  colorScheme: "light" | "dark" | "system";
  setColorScheme: (v: "light" | "dark" | "system") => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);
export { AppContext };

const STORAGE_KEYS = {
  expenses: "@app/expenses",
  savings: "@app/savings",
  journal: "@app/journal",
  currency: "@app/currency",
  geminiApiKey: "@app/geminiApiKey",
  profileName: "@app/profileName",
  profileEmoji: "@app/profileEmoji",
  weekStart: "@app/weekStart",
  financialGoal: "@app/financialGoal",
  colorScheme: "@app/colorScheme",
};

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [savingsPots, setSavingsPots] = useState<SavingsPot[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [currency, setCurrencyState] = useState("£");
  const [geminiApiKey, setGeminiApiKeyState] = useState("");
  const [profileName, setProfileNameState] = useState("");
  const [profileEmoji, setProfileEmojiState] = useState("😊");
  const [weekStart, setWeekStartState] = useState<"mon" | "sun">("mon");
  const [financialGoal, setFinancialGoalState] = useState("");
  const [colorScheme, setColorSchemeState] = useState<"light" | "dark" | "system">("system");

  useEffect(() => {
    (async () => {
      try {
        const [e, s, j, c, gk, pn, pe, ws, fg, cs] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.expenses),
          AsyncStorage.getItem(STORAGE_KEYS.savings),
          AsyncStorage.getItem(STORAGE_KEYS.journal),
          AsyncStorage.getItem(STORAGE_KEYS.currency),
          AsyncStorage.getItem(STORAGE_KEYS.geminiApiKey),
          AsyncStorage.getItem(STORAGE_KEYS.profileName),
          AsyncStorage.getItem(STORAGE_KEYS.profileEmoji),
          AsyncStorage.getItem(STORAGE_KEYS.weekStart),
          AsyncStorage.getItem(STORAGE_KEYS.financialGoal),
          AsyncStorage.getItem(STORAGE_KEYS.colorScheme),
        ]);
        if (e) setExpenses(JSON.parse(e));
        if (s) setSavingsPots(JSON.parse(s));
        if (j) setJournalEntries(JSON.parse(j));
        if (c) setCurrencyState(c);
        if (gk) setGeminiApiKeyState(gk);
        if (pn) setProfileNameState(pn);
        if (pe) setProfileEmojiState(pe);
        if (ws) setWeekStartState(ws as "mon" | "sun");
        if (fg) setFinancialGoalState(fg);
        if (cs) setColorSchemeState(cs as "light" | "dark" | "system");
      } catch {}
    })();
  }, []);

  const saveExpenses = useCallback(async (items: ExpenseItem[]) => {
    setExpenses(items);
    await AsyncStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(items));
  }, []);

  const saveSavings = useCallback(async (items: SavingsPot[]) => {
    setSavingsPots(items);
    await AsyncStorage.setItem(STORAGE_KEYS.savings, JSON.stringify(items));
  }, []);

  const saveJournal = useCallback(async (items: JournalEntry[]) => {
    setJournalEntries(items);
    await AsyncStorage.setItem(STORAGE_KEYS.journal, JSON.stringify(items));
  }, []);

  const addExpense = useCallback(
    (item: Omit<ExpenseItem, "id" | "createdAt" | "priority">) => {
      setExpenses((prev) => {
        const next = [
          ...prev,
          { ...item, id: genId(), createdAt: new Date().toISOString(), priority: prev.length },
        ];
        AsyncStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const updateExpense = useCallback(
    (id: string, item: Partial<ExpenseItem>) => {
      setExpenses((prev) => {
        const next = prev.map((e) => (e.id === id ? { ...e, ...item } : e));
        AsyncStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => {
      const next = prev.filter((e) => e.id !== id).map((e, i) => ({ ...e, priority: i }));
      AsyncStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(next));
      return next;
    });
  }, []);

  const reorderExpense = useCallback((id: string, direction: "up" | "down") => {
    setExpenses((prev) => {
      const sorted = [...prev].sort((a, b) => a.priority - b.priority);
      const idx = sorted.findIndex((e) => e.id === id);
      if (idx === -1) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return prev;
      const next = [...sorted];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      const reindexed = next.map((e, i) => ({ ...e, priority: i }));
      AsyncStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(reindexed));
      return reindexed;
    });
  }, []);

  const addSavingsPot = useCallback(
    (pot: Omit<SavingsPot, "id" | "createdAt">) => {
      setSavingsPots((prev) => {
        const next = [...prev, { ...pot, id: genId(), createdAt: new Date().toISOString() }];
        AsyncStorage.setItem(STORAGE_KEYS.savings, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const updateSavingsPot = useCallback((id: string, pot: Partial<SavingsPot>) => {
    setSavingsPots((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...pot } : p));
      AsyncStorage.setItem(STORAGE_KEYS.savings, JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteSavingsPot = useCallback((id: string) => {
    setSavingsPots((prev) => {
      const next = prev.filter((p) => p.id !== id);
      AsyncStorage.setItem(STORAGE_KEYS.savings, JSON.stringify(next));
      return next;
    });
  }, []);

  const addJournalEntry = useCallback(
    (entry: Omit<JournalEntry, "id" | "createdAt">) => {
      setJournalEntries((prev) => {
        const next = [
          { ...entry, id: genId(), createdAt: new Date().toISOString() },
          ...prev,
        ];
        AsyncStorage.setItem(STORAGE_KEYS.journal, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const updateJournalEntry = useCallback(
    (id: string, entry: Partial<JournalEntry>) => {
      setJournalEntries((prev) => {
        const next = prev.map((j) => (j.id === id ? { ...j, ...entry } : j));
        AsyncStorage.setItem(STORAGE_KEYS.journal, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const deleteJournalEntry = useCallback((id: string) => {
    setJournalEntries((prev) => {
      const next = prev.filter((j) => j.id !== id);
      AsyncStorage.setItem(STORAGE_KEYS.journal, JSON.stringify(next));
      return next;
    });
  }, []);

  const setCurrency = useCallback(async (c: string) => {
    setCurrencyState(c);
    await AsyncStorage.setItem(STORAGE_KEYS.currency, c);
  }, []);

  const setGeminiApiKey = useCallback(async (key: string) => {
    setGeminiApiKeyState(key);
    await AsyncStorage.setItem(STORAGE_KEYS.geminiApiKey, key);
  }, []);

  const setProfileName = useCallback(async (v: string) => {
    setProfileNameState(v);
    await AsyncStorage.setItem(STORAGE_KEYS.profileName, v);
  }, []);

  const setProfileEmoji = useCallback(async (v: string) => {
    setProfileEmojiState(v);
    await AsyncStorage.setItem(STORAGE_KEYS.profileEmoji, v);
  }, []);

  const setWeekStart = useCallback(async (v: "mon" | "sun") => {
    setWeekStartState(v);
    await AsyncStorage.setItem(STORAGE_KEYS.weekStart, v);
  }, []);

  const setFinancialGoal = useCallback(async (v: string) => {
    setFinancialGoalState(v);
    await AsyncStorage.setItem(STORAGE_KEYS.financialGoal, v);
  }, []);

  const setColorScheme = useCallback(async (v: "light" | "dark" | "system") => {
    setColorSchemeState(v);
    await AsyncStorage.setItem(STORAGE_KEYS.colorScheme, v);
  }, []);

  return (
    <AppContext.Provider
      value={{
        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
        reorderExpense,
        savingsPots,
        addSavingsPot,
        updateSavingsPot,
        deleteSavingsPot,
        journalEntries,
        addJournalEntry,
        updateJournalEntry,
        deleteJournalEntry,
        currency,
        setCurrency,
        geminiApiKey,
        setGeminiApiKey,
        profileName,
        profileEmoji,
        weekStart,
        financialGoal,
        setProfileName,
        setProfileEmoji,
        setWeekStart,
        setFinancialGoal,
        colorScheme,
        setColorScheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
