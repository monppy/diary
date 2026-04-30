import Link from "next/link";
import { cn } from "@/lib/utils";

const WEEK_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toMonthString(year: number, month: number): string {
  return `${year}-${pad(month)}`;
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const m0 = month - 1 + delta;
  const y = year + Math.floor(m0 / 12);
  const m = ((m0 % 12) + 12) % 12;
  return { year: y, month: m + 1 };
}

type Props = {
  year: number;
  month: number; // 1-12
  entryDates: string[]; // YYYY-MM-DD のリスト
  selectedDate?: string; // YYYY-MM-DD
  todayString: string; // YYYY-MM-DD (サーバー時計のずれ回避のため呼び出し元から渡す)
};

export function Calendar({ year, month, entryDates, selectedDate, todayString }: Props) {
  const dateSet = new Set(entryDates);
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const startOffset = firstDay.getUTCDay(); // 0=日
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  const cells: Array<{ day: number; date: string } | null> = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, date: toDateString(year, month, d) });
  }
  // 最後の週まで埋める
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link
          href={`/entries?month=${toMonthString(prev.year, prev.month)}`}
          className="text-sm text-muted-foreground hover:text-foreground px-2 py-1"
          aria-label="前の月"
        >
          ← {prev.year}年{prev.month}月
        </Link>
        <h2 className="text-lg font-semibold">
          {year}年{month}月
        </h2>
        <Link
          href={`/entries?month=${toMonthString(next.year, next.month)}`}
          className="text-sm text-muted-foreground hover:text-foreground px-2 py-1"
          aria-label="次の月"
        >
          {next.year}年{next.month}月 →
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEK_LABELS.map((w, i) => (
          <div
            key={w}
            className={cn(
              "text-xs py-1",
              i === 0 && "text-red-500",
              i === 6 && "text-blue-500",
              i !== 0 && i !== 6 && "text-muted-foreground",
            )}
          >
            {w}
          </div>
        ))}

        {cells.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} />;
          const hasEntry = dateSet.has(cell.date);
          const isSelected = cell.date === selectedDate;
          const isToday = cell.date === todayString;
          const dow = i % 7;
          return (
            <Link
              key={cell.date}
              href={`/entries?month=${toMonthString(year, month)}&date=${cell.date}`}
              scroll={false}
              className={cn(
                "aspect-square flex flex-col items-center justify-center rounded-md text-sm relative transition-colors",
                "hover:bg-muted",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                !isSelected && isToday && "ring-1 ring-primary",
                !isSelected && dow === 0 && "text-red-500",
                !isSelected && dow === 6 && "text-blue-500",
              )}
            >
              <span>{cell.day}</span>
              {hasEntry && (
                <span
                  className={cn(
                    "absolute bottom-1 h-1.5 w-1.5 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-primary",
                  )}
                  aria-label="日記あり"
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
