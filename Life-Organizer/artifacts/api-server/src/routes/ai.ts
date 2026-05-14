import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

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

type ChatTool = Parameters<typeof openai.chat.completions.create>[0]["tools"] extends readonly (infer T)[] | undefined ? T : never;

const TOOLS: ChatTool[] = [
  {
    type: "function",
    function: {
      name: "add_expense",
      description: "Add a new expense or subscription item to the user's tracker",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the expense or subscription" },
          amount: { type: "number", description: "Amount in the user's currency" },
          category: { type: "string", enum: ["subscription", "expense"], description: "Whether this is a recurring subscription or a one-off expense" },
          frequency: { type: "string", enum: ["daily", "weekly", "monthly", "yearly"], description: "How often the payment occurs" },
          notes: { type: "string", description: "Optional notes about this item" },
        },
        required: ["name", "amount", "category", "frequency"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_savings_pot",
      description: "Create a new savings pot or investment bucket",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the savings pot" },
          type: { type: "string", enum: ["savings", "investment"], description: "Savings or investment" },
          currentAmount: { type: "number", description: "Current amount already saved" },
          goalAmount: { type: "number", description: "Target goal amount" },
          notes: { type: "string", description: "Optional notes" },
        },
        required: ["name", "type", "currentAmount", "goalAmount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_journal_entry",
      description: "Add a journal entry with mood rating",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Optional title for the entry" },
          content: { type: "string", description: "Journal entry content" },
          mood: { type: "number", description: "Mood rating 1-5 (1=Awful, 2=Bad, 3=Okay, 4=Good, 5=Great)" },
          date: { type: "string", description: "Date in YYYY-MM-DD format, defaults to today" },
        },
        required: ["content", "mood"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_savings_amount",
      description: "Update the current amount in a savings pot by name",
      parameters: {
        type: "object",
        properties: {
          potName: { type: "string", description: "Name of the savings pot to update" },
          newAmount: { type: "number", description: "The new current amount (absolute value, not a delta)" },
        },
        required: ["potName", "newAmount"],
      },
    },
  },
];

router.post("/ai/chat", async (req, res) => {
  try {
    type ChatMessage = { role: "user" | "assistant" | "system"; content: string };
    const { messages = [], context = {} } = req.body as {
      messages: ChatMessage[];
      context: {
        expenses?: { name: string; amount: number; frequency: string; category: string }[];
        savingsPots?: { name: string; type: string; currentAmount: number; goalAmount: number }[];
        journalCount?: number;
        recentMoods?: number[];
        currency?: string;
      };
    };

    const currency = context.currency ?? "£";

    const expensesList = (context.expenses ?? [])
      .map((e) => `- ${e.name}: ${currency}${e.amount} ${e.frequency} (${e.category})`)
      .join("\n") || "None yet";

    const savingsList = (context.savingsPots ?? [])
      .map((p) => `- ${p.name}: ${currency}${p.currentAmount} saved of ${currency}${p.goalAmount} goal (${p.type})`)
      .join("\n") || "None yet";

    const moodSummary = (context.recentMoods ?? []).length > 0
      ? `Recent moods: ${context.recentMoods!.slice(0, 5).join(", ")} (scale 1–5)`
      : "No journal entries yet";

    const systemPrompt = `You are a friendly, concise financial and wellbeing assistant built into the Finance & Journal mobile app.
The user's currency is ${currency}.

Current user data:
EXPENSES & SUBSCRIPTIONS:
${expensesList}

SAVINGS & INVESTMENTS:
${savingsList}

JOURNAL: ${context.journalCount ?? 0} entries. ${moodSummary}

You can help the user by:
1. Answering questions about their finances, spending, and wellbeing
2. Adding expenses, subscriptions, savings pots, or journal entries by calling the appropriate function
3. Giving financial insights and encouragement

When the user asks you to add something, call the appropriate function AND include a short friendly confirmation message.
When answering questions, be concise and helpful. Use ${currency} for amounts.
Today's date is ${new Date().toISOString().split("T")[0]}.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      tools: TOOLS,
      tool_choice: "auto",
    });

    const choice = completion.choices[0];
    const toolCall = choice.message.tool_calls?.[0];

    if (toolCall?.type === "function") {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(toolCall.function.arguments); } catch {}

      const actionType = toolCall.function.name;
      let payload: Record<string, unknown> = { ...args };

      if (actionType === "add_expense") {
        payload.icon = pickIcon(String(args.name ?? ""), "expense");
        payload.color = pickColor(String(args.name ?? ""));
        payload.notes = args.notes ?? "";
        payload.priority = 999;
      } else if (actionType === "add_savings_pot") {
        payload.icon = pickIcon(String(args.name ?? ""), "savings");
        payload.color = pickColor(String(args.name ?? ""));
        payload.notes = args.notes ?? "";
      } else if (actionType === "add_journal_entry") {
        payload.date = args.date ?? new Date().toISOString().split("T")[0];
        payload.title = args.title ?? "";
      }

      const replyText = choice.message.content ?? getDefaultReply(actionType, args);

      res.json({ reply: replyText, action: { type: actionType, payload } });
    } else if (toolCall) {
      res.json({ reply: choice.message.content ?? "I couldn't process that tool request." });
    } else {
      res.json({ reply: choice.message.content ?? "I'm not sure how to help with that." });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI request failed. Please try again." });
  }
});

function getDefaultReply(type: string, args: Record<string, unknown>): string {
  switch (type) {
    case "add_expense": return `Added ${args.name} to your expenses!`;
    case "add_savings_pot": return `Created your ${args.name} savings pot!`;
    case "add_journal_entry": return "Journal entry saved!";
    case "update_savings_amount": return `Updated ${args.potName} savings amount!`;
    default: return "Done!";
  }
}

export default router;
