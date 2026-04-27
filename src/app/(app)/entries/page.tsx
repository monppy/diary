import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listEntries } from "@/lib/db/entries";
import { EntryCard } from "@/components/diary/EntryCard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function EntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? "1"));

  const { entries, total, hasMore } = await listEntries(user.id, page);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">日記一覧</h1>
        <span className="text-sm text-muted-foreground">{total} 件</span>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <p className="text-muted-foreground">まだ日記がありません</p>
          <Link href="/new" className={cn(buttonVariants())}>
            最初の日記を書く
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {(page > 1 || hasMore) && (
        <div className="flex justify-center gap-3 pt-2">
          {page > 1 && (
            <Link
              href={`/entries?page=${page - 1}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              ← 前のページ
            </Link>
          )}
          {hasMore && (
            <Link
              href={`/entries?page=${page + 1}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              次のページ →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
