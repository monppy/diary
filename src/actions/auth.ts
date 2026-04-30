"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types/action";

// 既存ユーザーかどうかを admin API で判定
async function findUserByEmail(email: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

// 既存ユーザー向けのメール送信なしログイン。
// admin.generateLink で hashed_token を取得し、verifyOtp でそのままセッションを張る。
async function signInExistingWithoutEmail(email: string): Promise<ActionResult<void>> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) return { success: false, error: error.message };
  const tokenHash = data.properties?.hashed_token;
  if (!tokenHash) {
    return { success: false, error: "ログイントークンの生成に失敗しました" };
  }

  const supabase = await createClient();
  const { error: verifyErr } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });
  if (verifyErr) return { success: false, error: verifyErr.message };

  return { success: true, data: undefined };
}

// Step 1: メールを受け取り、既存ユーザーなら即ログイン、初回ならOTP送信
export async function loginAction(
  _prev: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  const rawEmail = (formData.get("email") as string | null)?.trim();
  if (!rawEmail) return { success: false, error: "メールアドレスを入力してください" };
  const email = rawEmail.toLowerCase();

  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!ownerEmail) {
    return { success: false, error: "OWNER_EMAIL が未設定です" };
  }
  if (email !== ownerEmail) {
    return { success: false, error: "このメールアドレスではログインできません" };
  }

  let existing;
  try {
    existing = await findUserByEmail(email);
  } catch (e) {
    const message = e instanceof Error ? e.message : "ログイン状態の確認に失敗しました";
    return { success: false, error: message };
  }

  if (existing) {
    const result = await signInExistingWithoutEmail(email);
    if (!result.success) return result;
    redirect("/entries");
  }

  // 初回のみ OTP を送信
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

// Step 2: 初回ユーザーが受け取った6桁コードを検証
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
    return { success: false, error: "コードが正しくないか、期限切れです" };
  }

  redirect("/entries");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
