import * as z from "zod";

export const createTagSchema = z.object({
  name: z
    .string()
    .min(1, "タグ名は1文字以上必要です")
    .max(50, "タグ名は50文字以内で入力してください")
    .transform((s) => s.replace(/^#+/, "").trim())
    .pipe(z.string().min(1, "# だけのタグ名は使用できません")),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
