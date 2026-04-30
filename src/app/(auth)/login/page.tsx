"use client";

import { useActionState, useState } from "react";
import { loginAction, verifyOtpAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [sendState, sendAction, isSending] = useActionState(loginAction, null);
  const [verifyState, verifyAction, isVerifying] = useActionState(verifyOtpAction, null);
  const [email, setEmail] = useState("");

  // 初回登録時のみ codeSent=true となり、OTP 入力欄に切り替わる
  const codeSent = sendState?.success === true;

  if (codeSent) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-center">確認コードを入力</h1>
        <form action={verifyAction} className="space-y-4">
          <input type="hidden" name="email" value={email} />
          <div className="space-y-1.5">
            <Label htmlFor="token" className="sr-only">
              確認コード
            </Label>
            <Input
              id="token"
              name="token"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              placeholder="123456"
              autoFocus
              autoComplete="one-time-code"
              className="text-center text-2xl tracking-[0.5em] font-mono"
            />
          </div>
          {verifyState && !verifyState.success && (
            <p className="text-sm text-destructive">{verifyState.error}</p>
          )}
          <Button type="submit" className="w-full" disabled={isVerifying}>
            {isVerifying ? "確認中…" : "ログイン"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <form action={sendAction} className="space-y-4">
      <h1 className="text-xl font-semibold text-center">📔 日記</h1>
      <div className="space-y-1.5">
        <Label htmlFor="email" className="sr-only">
          メールアドレス
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="メールアドレス"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {sendState && !sendState.success && (
        <p className="text-sm text-destructive">{sendState.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={isSending}>
        {isSending ? "..." : "ログイン"}
      </Button>
    </form>
  );
}
