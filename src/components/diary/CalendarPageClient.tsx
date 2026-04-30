"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar } from "./Calendar";
import { EntryCard } from "./EntryCard";
import { getEntriesByDateAction } from "@/actions/entries";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { EntryWithTags } from "@/lib/db/entries";

function formatDateJp(dateStr: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(`${dateStr}T00:00:00`));
}

type Props = {
  year: number;
  month: number;
  entryDates: string[];
  initialSelectedDate?: string;
  initialEntries: EntryWithTags[];
  todayString: string;
};

export function CalendarPageClient({
  year,
  month,
  entryDates,
  initialSelectedDate,
  initialEntries,
  todayString,
}: Props) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [entries, setEntries] = useState(initialEntries);
  const [isPending, startTransition] = useTransition();

  function handleSelectDate(date: string) {
    // 即座に選択状態を反映 → カレンダーのハイライトがすぐ変わる
    setSelectedDate(date);
    // URL を更新してブラウザ履歴に残す (ページ再レンダリングなし)
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    router.replace(`/entries?month=${monthStr}&date=${date}`, { scroll: false });
    // バックグラウンドでその日の日記だけ取得
    startTransition(async () => {
      const result = await getEntriesByDateAction(date);
      if (result.success) setEntries(result.data);
    });
  }

  return (
    <div className="space-y-6">
      <Calendar
        year={year}
        month={month}
        entryDates={entryDates}
        selectedDate={selectedDate}
        todayString={todayString}
        onSelectDate={handleSelectDate}
      />

      <Separator />

      {selectedDate ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className={cn("text-base font-semibold", isPending && "opacity-50 transition-opacity")}>
              {formatDateJp(selectedDate)}
            </h3>
            <Link
              href={`/new?date=${selectedDate}`}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              + この日に書く
            </Link>
          </div>

          {isPending ? (
            <div className="space-y-3">
              {/* スケルトン */}
              {[1, 2].map((n) => (
                <div key={n} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              この日の日記はまだありません
            </p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
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
