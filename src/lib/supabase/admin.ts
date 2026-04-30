import { createClient } from "@supabase/supabase-js";

// service role key を使うサーバー専用クライアント。
// 認証チェックをバイパスするため、絶対にクライアントから呼ばないこと。
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase admin の環境変数が未設定です");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
