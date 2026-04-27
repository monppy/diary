import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { EntryWithTags } from "@/lib/db/entries";
import { TagBadge } from "./TagBadge";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(date));
}

function excerpt(body: string, maxLen = 120): string {
  const text = body.replace(/^#+\s.+$/gm, "").trim();
  return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
}

export function EntryCard({ entry }: { entry: EntryWithTags }) {
  return (
    <Link href={`/entries/${entry.id}`}>
      <Card className="hover:bg-muted/40 transition-colors cursor-pointer">
        <CardHeader className="pb-2 pt-4">
          <p className="text-xs text-muted-foreground">{formatDate(entry.entryDate)}</p>
        </CardHeader>
        <CardContent className="pb-4 space-y-3">
          <p className="text-sm leading-relaxed text-foreground line-clamp-3">
            {excerpt(entry.body)}
          </p>
          {entry.tagNames.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {entry.tagNames.map((name) => (
                <TagBadge key={name} name={name} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
