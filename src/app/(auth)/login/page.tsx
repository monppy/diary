"use client";

import { useActionState, useState, useTransition } from "react";
import { loginAction, verifyOtpAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  // Step 1: メール送信
  const [sendState, sendAction, isSending] = useActionState(loginAction, null);
  // Step 2: OTP 検証
  const [verifyState, verifyAction, isVerifying] = useActionState(verifyOtpAction, null);

  const [email, setEmail] = useState("");
  const [, startResend] = useTransition();

  // Step 1 が成功したら Step 2 画面へ
  const codeSent = sendState?.success === true;

  function handleResend() {
    startResend(async () => {
      const fd = new FormData();
      fd.set("email", email);
      await loginAction(null, fd);
    });
  }

  if (codeSent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>コードを入力</CardTitle>
          <CardDescription>
            <span className="font-medium text-foreground">{email}</span> に届いた
            <br />
            6桁のコードを入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={verifyAction} className="space-y-4">
            <input type="hidden" name="email" value={email} />
            <div className="space-y-1.5">
              <Label htmlFor="token">確認コード</Label>
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
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              コードが届かない場合は
              <button
                type="button"
                onClick={handleResend}
                className="underline underline-offset-2 ml-1 hover:text-foreground"
              >
                再送信
              </button>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              メール内のリンクをクリックしてもログインできます
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ログイン</CardTitle>
        <CardDescription>
          メールアドレスを入力すると確認コードを送信します
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={sendAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
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
            {isSending ? "送信中…" : "コードを送信する"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          初回は自動でアカウントが作成されます
        </p>
      </CardContent>
    </Card>
  );
}
