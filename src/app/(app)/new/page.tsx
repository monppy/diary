import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EntryForm } from "@/components/diary/EntryForm";

type SearchParams = { date?: string };

export default async function NewEntryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { date } = await searchParams;
  const valid = date && /^\d{4}-\d{2}-\d{2}$/.test(date);
  const defaultDate = valid ? date : new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">新しい日記</h1>
      <EntryForm defaultDate={defaultDate} />
    </div>
  );
}
