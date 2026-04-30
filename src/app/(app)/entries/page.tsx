import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEntryDatesInMonth, listEntriesByDate } from "@/lib/db/entries";
import { CalendarPageClient } from "@/components/diary/CalendarPageClient";

type SearchParams = { month?: string; date?: string };

function parseMonth(
  input: string | undefined,
  fallback: { year: number; month: number },
): { year: number; month: number } {
  if (!input) return fallback;
  const m = input.match(/^(\d{4})-(\d{2})$/);
  if (!m) return fallback;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return fallback;
  return { year, month };
}

function isValidDate(input: string | undefined): input is string {
  return !!input && /^\d{4}-\d{2}-\d{2}$/.test(input);
}

export default async function EntriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const fallbackMonth = { year: today.getFullYear(), month: today.getMonth() + 1 };
  const dateMonthFallback = isValidDate(params.date)
    ? { year: Number(params.date.slice(0, 4)), month: Number(params.date.slice(5, 7)) }
    : fallbackMonth;
  const { year, month } = parseMonth(params.month, dateMonthFallback);
  const selectedDate = isValidDate(params.date) ? params.date : undefined;

  const [entryDates, initialEntries] = await Promise.all([
    getEntryDatesInMonth(user.id, year, month),
    selectedDate ? listEntriesByDate(user.id, selectedDate) : Promise.resolve([]),
  ]);

  return (
    <CalendarPageClient
      year={year}
      month={month}
      entryDates={entryDates}
      initialSelectedDate={selectedDate}
      initialEntries={initialEntries}
      todayString={todayString}
    />
  );
}
