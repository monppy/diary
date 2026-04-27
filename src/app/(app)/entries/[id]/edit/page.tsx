import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEntry } from "@/lib/db/entries";
import { EntryForm } from "@/components/diary/EntryForm";

export default async function EditEntryPage({
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">日記を編集</h1>
      <EntryForm entry={entry} />
    </div>
  );
}
