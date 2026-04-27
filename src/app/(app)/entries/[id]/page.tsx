import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEntry } from "@/lib/db/entries";
import { TagBadge } from "@/components/diary/TagBadge";
import { DeleteButton } from "@/components/diary/DeleteButton";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(date));
}

export default async function EntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const entry = await getEntry(user.id, id);
  if (!entry) notFound();

  return (
    <article className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground font-medium">
          {formatDate(entry.entryDate)}
        </p>
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/entries/${id}/edit`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            編集
          </Link>
          <DeleteButton id={id} />
        </div>
      </div>

      <Separator />

      <div className="text-sm leading-8 whitespace-pre-wrap text-foreground">
        {entry.body}
      </div>

      {entry.tagNames.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-wrap gap-2">
            {entry.tagNames.map((name) => (
              <TagBadge key={name} name={name} />
            ))}
          </div>
        </>
      )}

      <Separator />

      <Link
        href="/entries"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
      >
        ← 一覧に戻る
      </Link>
    </article>
  );
}
