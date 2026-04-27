"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createEntryAction, updateEntryAction } from "@/actions/entries";
import type { EntryWithTags } from "@/lib/db/entries";

const TEMPLATE_SECTIONS = [
  { key: "did", title: "今日やったこと" },
  { key: "thought", title: "思ったこと" },
  { key: "tomorrow", title: "明日に活かすこと" },
] as const;

function serializeTemplate(sections: Record<string, string>): string {
  return TEMPLATE_SECTIONS.map(
    ({ key, title }) => `## ${title}\n${sections[key] ?? ""}`,
  ).join("\n\n");
}

function parseTemplate(body: string): Record<string, string> {
  const result: Record<string, string> = {};
  const parts = body.split(/^## /m);
  for (const part of parts) {
    for (const { key, title } of TEMPLATE_SECTIONS) {
      if (part.startsWith(title)) {
        result[key] = part.slice(title.length).replace(/^\n/, "").trim();
      }
    }
  }
  return result;
}

function toDateString(date: Date | string): string {
  return typeof date === "string"
    ? date.slice(0, 10)
    : date.toISOString().slice(0, 10);
}

function parseTagInput(value: string): string[] {
  return value
    .split(/[,\s]+/)
    .map((t) => t.replace(/^#+/, "").trim())
    .filter(Boolean);
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
  const [mode, setMode] = useState<"FREE" | "TEMPLATE">(entry?.mode ?? "FREE");
  const [freeBody, setFreeBody] = useState(
    entry?.mode === "FREE" ? entry.body : "",
  );
  const [sections, setSections] = useState<Record<string, string>>(
    entry?.mode === "TEMPLATE" ? parseTemplate(entry.body) : {},
  );
  const [tagInput, setTagInput] = useState(
    entry?.tagNames.map((t) => `#${t}`).join(" ") ?? "",
  );
  const [entryDate, setEntryDate] = useState(
    entry ? toDateString(entry.entryDate) : (defaultDate ?? new Date().toISOString().slice(0, 10)),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = mode === "TEMPLATE" ? serializeTemplate(sections) : freeBody;
    if (!body.trim()) {
      setError("本文を入力してください");
      return;
    }
    const tagNames = parseTagInput(tagInput);
    setError(null);

    startTransition(async () => {
      const result = isEdit
        ? await updateEntryAction(entry.id, { body, mode, tagNames })
        : await createEntryAction({ entryDate, body, mode, tagNames });

      if (result.success) {
        router.push(isEdit ? `/entries/${entry.id}` : "/entries");
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

      <div className="flex gap-2">
        {(["FREE", "TEMPLATE"] as const).map((m) => (
          <Button
            key={m}
            type="button"
            variant={mode === m ? "default" : "outline"}
            size="sm"
            onClick={() => setMode(m)}
          >
            {m === "FREE" ? "自由記述" : "テンプレート"}
          </Button>
        ))}
      </div>

      {mode === "FREE" ? (
        <div className="space-y-1.5">
          <Label htmlFor="body">本文</Label>
          <Textarea
            id="body"
            value={freeBody}
            onChange={(e) => setFreeBody(e.target.value)}
            rows={14}
            placeholder="今日のことを書いてみましょう…"
          />
        </div>
      ) : (
        <div className="space-y-5">
          {TEMPLATE_SECTIONS.map(({ key, title }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{title}</Label>
              <Textarea
                id={key}
                value={sections[key] ?? ""}
                onChange={(e) =>
                  setSections((prev) => ({ ...prev, [key]: e.target.value }))
                }
                rows={4}
                placeholder={`${title}…`}
              />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="tags">タグ</Label>
        <Input
          id="tags"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          placeholder="#仕事 #人間関係  (スペース・カンマ区切り)"
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
