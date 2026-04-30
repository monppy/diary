import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEntryDatesInMonth, listEntriesByDate } from "@/lib/db/entries";
import { EntryCard } from "@/components/diary/EntryCard";
import { Calendar } from "@/components/diary/Calendar";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type SearchParams = { month?: string; date?: string };

function parseMonth(input: string | undefined, fallback: { year: number; month: number }): {
  year: number;
  month: number;
} {
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

function formatDateJp(dateStr: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(`${dateStr}T00:00:00`));
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

  // 月の優先順: ?month → ?date から導出 → 今月
  const fallbackMonth = { year: today.getFullYear(), month: today.getMonth() + 1 };
  const dateMonthFallback = isValidDate(params.date)
    ? { year: Number(params.date.slice(0, 4)), month: Number(params.date.slice(5, 7)) }
    : fallbackMonth;
  const { year, month } = parseMonth(params.month, dateMonthFallback);
  const selectedDate = isValidDate(params.date) ? params.date : undefined;

  const [entryDates, dayEntries] = await Promise.all([
    getEntryDatesInMonth(user.id, year, month),
    selectedDate ? listEntriesByDate(user.id, selectedDate) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <Calendar
        year={year}
        month={month}
        entryDates={entryDates}
        selectedDate={selectedDate}
        todayString={todayString}
      />

      <Separator />

      {selectedDate ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">{formatDateJp(selectedDate)}</h3>
            <Link
              href={`/new?date=${selectedDate}`}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              + この日に書く
            </Link>
          </div>
          {dayEntries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              この日の日記はまだありません
            </p>
          ) : (
            <div className="space-y-3">
              {dayEntries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          日付を選ぶとその日の日記が表示されます
        </p>
      )}
    </div>
  );
}
