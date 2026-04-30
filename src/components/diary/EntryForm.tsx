"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createEntryAction, updateEntryAction } from "@/actions/entries";
import type { EntryWithTags } from "@/lib/db/entries";

function toDateString(date: Date | string): string {
  return typeof date === "string"
    ? date.slice(0, 10)
    : date.toISOString().slice(0, 10);
}

type Props = {
  entry?: EntryWithTags;
  defaultDate?: string;
};

export function EntryForm({ entry, defaultDate }: Props) {
  const isEdit = !!entry;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState(entry?.body ?? "");
  const [entryDate, setEntryDate] = useState(
    entry
      ? toDateString(entry.entryDate)
      : (defaultDate ?? new Date().toISOString().slice(0, 10)),
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const restoredRef = useRef(false);
  // 下書きキー: 新規は日付ごと、編集はエントリIDごと
  const draftKey = isEdit
    ? `diary:draft:edit:${entry.id}`
    : `diary:draft:new:${entryDate}`;

  // 初回マウント時に localStorage から下書きを復元。
  // SSRでは window がないので空文字を返し、ハイドレーション後に上書きする。
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved !== null && saved !== (entry?.body ?? "")) {
        // localStorage は外部ストアなので、値を React 状態に同期する必要がある
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBody(saved);
      }
    } catch {
      // localStorage が使えない環境は黙って無視
    }
    // 初回のみ実行する。draftKey の変化で再復元はしない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 入力をデバウンスして localStorage に保存
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (body) {
          localStorage.setItem(draftKey, body);
        } else {
          localStorage.removeItem(draftKey);
        }
      } catch {
        // 無視
      }
    }, 300);
    return () => clearTimeout(t);
  }, [body, draftKey]);

  // iOS Safari: キーボードが開閉すると visualViewport が縮小・拡大する
  // - フォームに padding-bottom を追加してキーボード上に余白を確保
  // - textarea の scrollTop を調整してカーソル行をキーボードの上に表示
  // - window.scrollBy は使わない（ページ全体が跳ぶのを防ぐため）
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const form = formRef.current;

    const handleResize = () => {
      const ta = textareaRef.current;
      if (!form) return;

      const keyboardHeight = Math.max(
        0,
        window.innerHeight - vv.height - vv.offsetTop,
      );

      form.style.paddingBottom = keyboardHeight > 0 ? `${keyboardHeight}px` : "";

      if (keyboardHeight > 0 && ta && document.activeElement === ta) {
        const selStart = ta.selectionStart;
        if (selStart == null) return;

        const textBefore = ta.value.substring(0, selStart);
        const lineIndex = textBefore.split("\n").length - 1;

        const style = getComputedStyle(ta);
        const lineHeight =
          parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4;
        const paddingTop = parseFloat(style.paddingTop) || 0;

        const cursorY = paddingTop + lineIndex * lineHeight;

        // textarea のうちキーボードに隠れず実際に見えている高さ
        const taRect = ta.getBoundingClientRect();
        const visibleBottom = vv.offsetTop + vv.height;
        const taVisibleHeight = Math.max(0, visibleBottom - taRect.top);

        const margin = 24;
        if (cursorY - ta.scrollTop > taVisibleHeight - lineHeight - margin) {
          ta.scrollTop = Math.max(
            0,
            cursorY - taVisibleHeight + lineHeight + margin,
          );
        }
      }
    };

    vv.addEventListener("resize", handleResize);
    vv.addEventListener("scroll", handleResize);
    return () => {
      vv.removeEventListener("resize", handleResize);
      vv.removeEventListener("scroll", handleResize);
      if (form) form.style.paddingBottom = "";
    };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) {
      setError("本文を入力してください");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = isEdit
        ? await updateEntryAction(entry.id, { body })
        : await createEntryAction({ entryDate, body, mode: "FREE", tagNames: [] });

      if (result.success) {
        try {
          localStorage.removeItem(draftKey);
        } catch {
          // 無視
        }
        router.push(
          isEdit ? `/entries/${entry.id}` : `/entries?date=${entryDate}`,
        );
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {!isEdit && (
        <div className="space-y-1.5">
          <Label htmlFor="entryDate">日付</Label>
          <Input
            id="entryDate"
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            required
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="body">本文</Label>
        <Textarea
          ref={textareaRef}
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          placeholder="今日のことを書いてみましょう…"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "保存中…" : isEdit ? "更新する" : "作成する"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}
