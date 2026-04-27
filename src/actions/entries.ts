"use server";

import { revalidatePath } from "next/cache";
import {
  createEntry,
  deleteEntry,
  searchEntries,
  updateEntry,
} from "@/lib/db/entries";
import type { EntryWithTags, EntryPage } from "@/lib/db/entries";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/action";
import {
  createEntrySchema,
  searchEntrySchema,
  updateEntrySchema,
} from "@/lib/validators/entry";
import type {
  CreateEntryInput,
  SearchEntryInput,
  UpdateEntryInput,
} from "@/lib/validators/entry";

async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Unauthorized");
  return data.user.id;
}

// ------------------------------------------------------------------

export async function createEntryAction(
  input: CreateEntryInput,
): Promise<ActionResult<EntryWithTags>> {
  const parsed = createEntrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "入力内容に問題があります",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const userId = await getAuthenticatedUserId();
    const entry = await createEntry(userId, parsed.data);
    revalidatePath("/entries");
    revalidatePath("/");
    return { success: true, data: entry };
  } catch (e) {
    const message = e instanceof Error ? e.message : "作成に失敗しました";
    return { success: false, error: message };
  }
}

export async function updateEntryAction(
  id: string,
  input: UpdateEntryInput,
): Promise<ActionResult<EntryWithTags>> {
  const parsed = updateEntrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "入力内容に問題があります",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const userId = await getAuthenticatedUserId();
    const entry = await updateEntry(userId, id, parsed.data);
    if (!entry) return { success: false, error: "日記が見つかりません" };
    revalidatePath(`/entries/${id}`);
    revalidatePath("/entries");
    return { success: true, data: entry };
  } catch (e) {
    const message = e instanceof Error ? e.message : "更新に失敗しました";
    return { success: false, error: message };
  }
}

export async function deleteEntryAction(
  id: string,
): Promise<ActionResult<void>> {
  try {
    const userId = await getAuthenticatedUserId();
    const deleted = await deleteEntry(userId, id);
    if (!deleted) return { success: false, error: "日記が見つかりません" };
    revalidatePath("/entries");
    revalidatePath("/");
    return { success: true, data: undefined };
  } catch (e) {
    const message = e instanceof Error ? e.message : "削除に失敗しました";
    return { success: false, error: message };
  }
}

export async function searchEntriesAction(
  input: SearchEntryInput,
): Promise<ActionResult<EntryPage>> {
  const parsed = searchEntrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "検索条件に問題があります",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const userId = await getAuthenticatedUserId();
    const page = await searchEntries(userId, parsed.data);
    return { success: true, data: page };
  } catch (e) {
    const message = e instanceof Error ? e.message : "検索に失敗しました";
    return { success: false, error: message };
  }
}
