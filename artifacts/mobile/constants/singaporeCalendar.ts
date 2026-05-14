export type SingaporeCalendarEventType = "public_holiday" | "important_date";

export interface SingaporeCalendarEvent {
  date: string;
  title: string;
  type: SingaporeCalendarEventType;
  note?: string;
}

// Static fallback for 2026 (used when live API is unavailable)
const FALLBACK_2026: SingaporeCalendarEvent[] = [
  { date: "2026-01-01", title: "New Year's Day", type: "public_holiday" },
  { date: "2026-02-17", title: "Chinese New Year", type: "public_holiday" },
  { date: "2026-02-18", title: "Chinese New Year", type: "public_holiday" },
  { date: "2026-03-21", title: "Hari Raya Puasa", type: "public_holiday" },
  { date: "2026-04-03", title: "Good Friday", type: "public_holiday" },
  { date: "2026-05-01", title: "Labour Day", type: "public_holiday" },
  { date: "2026-05-27", title: "Hari Raya Haji", type: "public_holiday" },
  { date: "2026-05-31", title: "Vesak Day", type: "public_holiday" },
  { date: "2026-08-09", title: "National Day", type: "public_holiday" },
  { date: "2026-11-08", title: "Deepavali", type: "public_holiday" },
  { date: "2026-12-25", title: "Christmas Day", type: "public_holiday" },
];

// Consolidated dataset covering 2020–2026 from Ministry of Manpower via data.gov.sg
const SG_API_URL =
  "https://data.gov.sg/api/action/datastore_search?resource_id=d_8ef23381f9417e4d4254ee8b4dcdb176&limit=200";

// In-memory cache to avoid repeated network calls
const _cache: Record<number, SingaporeCalendarEvent[]> = {};

/**
 * Fetches Singapore public holidays for a given year from the live data.gov.sg API.
 * Falls back to static 2026 data when the API is unavailable or the year is not covered.
 */
export async function fetchSingaporeHolidays(
  year: number
): Promise<SingaporeCalendarEvent[]> {
  if (_cache[year]) return _cache[year];

  try {
    const res = await fetch(SG_API_URL);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    if (!json.success) throw new Error("API returned failure");

    const all: SingaporeCalendarEvent[] = (json.result.records as Array<{
      date: string;
      holiday: string;
    }>).map((r) => ({
      date: r.date,
      title: r.holiday,
      type: "public_holiday" as SingaporeCalendarEventType,
    }));

    // Cache every year that appears in the response
    const byYear: Record<number, SingaporeCalendarEvent[]> = {};
    for (const ev of all) {
      const y = parseInt(ev.date.substring(0, 4), 10);
      if (!byYear[y]) byYear[y] = [];
      byYear[y].push(ev);
    }
    for (const [y, events] of Object.entries(byYear)) {
      _cache[Number(y)] = events;
    }

    return _cache[year] ?? [];
  } catch {
    // Network unavailable or API changed — use static fallback
    return year === 2026 ? FALLBACK_2026 : [];
  }
}