"use server";

import { createTag, listTags } from "@/lib/db/tags";
import type { TagItem } from "@/lib/db/tags";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/action";
import { createTagSchema } from "@/lib/validators/tag";
import type { CreateTagInput } from "@/lib/validators/tag";

async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Unauthorized");
  return data.user.id;
}

export async function listTagsAction(): Promise<ActionResult<TagItem[]>> {
  try {
    const userId = await getAuthenticatedUserId();
    const tags = await listTags(userId);
    return { success: true, data: tags };
  } catch (e) {
    const message = e instanceof Error ? e.message : "タグ取得に失敗しました";
    return { success: false, error: message };
  }
}

export async function createTagAction(
  input: CreateTagInput,
): Promise<ActionResult<TagItem>> {
  const parsed = createTagSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "タグ名に問題があります",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const userId = await getAuthenticatedUserId();
    const tag = await createTag(userId, parsed.data);
    return { success: true, data: tag };
  } catch (e) {
    const message = e instanceof Error ? e.message : "タグ作成に失敗しました";
    return { success: false, error: message };
  }
}
