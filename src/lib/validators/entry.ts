import * as z from "zod";
import { EntryMode } from "@/generated/prisma/enums";

// タグ名を正規化する: 先頭の # を除去してトリム
const tagNameSchema = z
  .string()
  .min(1, "タグ名は1文字以上必要です")
  .max(50, "タグ名は50文字以内で入力してください")
  .transform((s) => s.replace(/^#+/, "").trim())
  .pipe(z.string().min(1, "# だけのタグ名は使用できません"));

const tagNamesSchema = z
  .array(tagNameSchema)
  .max(20, "タグは1エントリーにつき20個まで")
  .optional()
  .default([]);

// YYYY-MM-DD 形式の日付文字列
const entryDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付は YYYY-MM-DD 形式で入力してください");

// Zod v4 では z.nativeEnum が z.enum に統合された
const entryModeSchema = z.enum(EntryMode);

// ------------------------------------------------------------------
// 日記作成 (Server Action 入力)
// ------------------------------------------------------------------
export const createEntrySchema = z.object({
  entryDate: entryDateSchema,
  body: z
    .string()
    .min(1, "本文は必須です")
    .max(50_000, "本文は50,000文字以内で入力してください"),
  mode: entryModeSchema.default("FREE"),
  templateKey: z.string().max(100).optional(),
  tagNames: tagNamesSchema,
});

export type CreateEntryInput = z.infer<typeof createEntrySchema>;

// ------------------------------------------------------------------
// 日記更新 (Server Action 入力)
// entryDate は作成後に変更しない設計
// tagNames は省略可。省略時は既存タグを保持する (UI からタグを外しても DB は温存)
// ------------------------------------------------------------------
export const updateEntrySchema = z.object({
  body: z
    .string()
    .min(1, "本文は必須です")
    .max(50_000, "本文は50,000文字以内で入力してください")
    .optional(),
  mode: entryModeSchema.optional(),
  templateKey: z.string().max(100).optional(),
  tagNames: z
    .array(tagNameSchema)
    .max(20, "タグは1エントリーにつき20個まで")
    .optional(),
});

export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;

// ------------------------------------------------------------------
// 日記検索 (検索ページのクエリパラメータ)
// ------------------------------------------------------------------
export const searchEntrySchema = z
  .object({
    q: z.string().max(200).optional(),
    tagNames: z.array(z.string().min(1).max(50)).optional(),
    dateFrom: entryDateSchema.optional(),
    dateTo: entryDateSchema.optional(),
    // URLパラメータは文字列で届くので coerce で数値変換
    page: z.coerce.number().int().min(1).default(1),
  })
  .refine(
    (data) => {
      if (data.dateFrom && data.dateTo) {
        return data.dateFrom <= data.dateTo;
      }
      return true;
    },
    { message: "開始日は終了日以前にしてください", path: ["dateFrom"] },
  );

export type SearchEntryInput = z.infer<typeof searchEntrySchema>;
