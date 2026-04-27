"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/action";

// Step 1: メールに6桁コードを送信
export async function loginAction(
  _prev: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  const email = (formData.get("email") as string | null)?.trim();
  if (!email) return { success: false, error: "メールアドレスを入力してください" };

  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") ?? "";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      // magic link のフォールバックも保持しておく
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

// Step 2: 6桁コードを検証してセッションを確立
export async function verifyOtpAction(
  _prev: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  const email = (formData.get("email") as string | null)?.trim();
  const token = (formData.get("token") as string | null)?.trim();

  if (!email || !token) {
    return { success: false, error: "コードを入力してください" };
  }
  if (!/^\d{6}$/.test(token)) {
    return { success: false, error: "6桁の数字を入力してください" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    return { success: false, error: "コードが正しくないか、期限切れです。再送信してください" };
  }

  redirect("/entries");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
