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

  // カーソル行のピクセル位置を計算してキーボードの上に出るようスクロール
  // \n カウントで行インデックスを求め、line-height をかけて Y オフセットを出す
  function scrollCursorIntoView(ta: HTMLTextAreaElement) {
    const selStart = ta.selectionStart;
    if (selStart == null) return;

    const textBefore = ta.value.substring(0, selStart);
    const lineIndex = textBefore.split("\n").length - 1;

    const style = getComputedStyle(ta);
    const lineHeight =
      parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4;
    const paddingTop = parseFloat(style.paddingTop) || 0;

    const taRect = ta.getBoundingClientRect();
    // カーソル行の画面上の下端 Y 座標
    const cursorBottom =
      taRect.top + paddingTop + (lineIndex + 1) * lineHeight - ta.scrollTop;

    const vv = window.visualViewport;
    const visibleTop = vv?.offsetTop ?? 0;
    const visibleBottom = visibleTop + (vv?.height ?? window.innerHeight);
    const margin = 32;

    const overflow = cursorBottom - (visibleBottom - margin);
    if (overflow > 0) {
      window.scrollBy({ top: overflow, behavior: "smooth" });
    }
  }

  // モバイルでキーボードが開いたとき（visualViewport リサイズ時）にも追跡する
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      const ta = textareaRef.current;
      if (ta && document.activeElement === ta) scrollCursorIntoView(ta);
    };
    vv.addEventListener("resize", handler);
    return () => vv.removeEventListener("resize", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleInput(e: React.FormEvent<HTMLTextAreaElement>) {
    scrollCursorIntoView(e.currentTarget);
  }

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
    <form onSubmit={handleSubmit} className="space-y-6">
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
          onInput={handleInput}
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
