import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { searchEntries } from "@/lib/db/entries";
import { EntryCard } from "@/components/diary/EntryCard";
import { SearchForm } from "@/components/diary/SearchForm";
import { Separator } from "@/components/ui/separator";

type SearchPageParams = {
  q?: string;
  tags?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchPageParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const hasQuery = !!(params.q || params.tags || params.dateFrom || params.dateTo);

  let results = null;
  if (hasQuery) {
    const tagNames = params.tags
      ? params.tags
          .split(",")
          .map((t) => t.replace(/^#+/, "").trim())
          .filter(Boolean)
      : undefined;

    results = await searchEntries(user.id, {
      q: params.q,
      tagNames,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      page: Math.max(1, Number(params.page ?? "1")),
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">検索</h1>
      {/* useSearchParams を使うので Suspense でラップ */}
      <Suspense fallback={null}>
        <SearchForm />
      </Suspense>

      {results !== null && (
        <>
          <Separator />
          <p className="text-sm text-muted-foreground">{results.total} 件</p>
          {results.entries.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              検索結果がありません
            </p>
          ) : (
            <div className="space-y-3">
              {results.entries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
