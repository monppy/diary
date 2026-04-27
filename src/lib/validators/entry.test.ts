import { describe, it, expect } from "vitest";
import {
  createEntrySchema,
  searchEntrySchema,
  updateEntrySchema,
} from "./entry";

describe("createEntrySchema", () => {
  it("有効な入力を受け付ける", () => {
    const result = createEntrySchema.safeParse({
      entryDate: "2026-04-27",
      body: "今日の振り返り",
    });
    expect(result.success).toBe(true);
  });

  it("mode のデフォルト値は FREE", () => {
    const result = createEntrySchema.safeParse({
      entryDate: "2026-04-27",
      body: "test",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBe("FREE");
    }
  });

  it("tagNames のデフォルト値は空配列", () => {
    const result = createEntrySchema.safeParse({
      entryDate: "2026-04-27",
      body: "test",
    });
    if (result.success) {
      expect(result.data.tagNames).toEqual([]);
    }
  });

  it("本文が空のときは失敗する", () => {
    const result = createEntrySchema.safeParse({
      entryDate: "2026-04-27",
      body: "",
    });
    expect(result.success).toBe(false);
  });

  it("日付が YYYY-MM-DD 形式でないときは失敗する", () => {
    const invalid = ["27/04/2026", "2026/04/27", "2026-4-27", "not-a-date"];
    for (const entryDate of invalid) {
      const result = createEntrySchema.safeParse({ entryDate, body: "test" });
      expect(result.success, `${entryDate} は不正な形式のはず`).toBe(false);
    }
  });

  it("tagNames の先頭 # を除去して正規化する", () => {
    const result = createEntrySchema.safeParse({
      entryDate: "2026-04-27",
      body: "test",
      tagNames: ["#仕事", "##人間関係", "趣味"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tagNames).toEqual(["仕事", "人間関係", "趣味"]);
    }
  });

  it("# だけのタグ名は失敗する", () => {
    const result = createEntrySchema.safeParse({
      entryDate: "2026-04-27",
      body: "test",
      tagNames: ["#"],
    });
    expect(result.success).toBe(false);
  });

  it("タグが 20 個を超えると失敗する", () => {
    const result = createEntrySchema.safeParse({
      entryDate: "2026-04-27",
      body: "test",
      tagNames: Array.from({ length: 21 }, (_, i) => `tag${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("TEMPLATE モードを受け付ける", () => {
    const result = createEntrySchema.safeParse({
      entryDate: "2026-04-27",
      body: "## 今日やったこと\nコード",
      mode: "TEMPLATE",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.mode).toBe("TEMPLATE");
  });
});

describe("updateEntrySchema", () => {
  it("全フィールドが省略可能", () => {
    const result = updateEntrySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("本文が空文字のときは失敗する", () => {
    const result = updateEntrySchema.safeParse({ body: "" });
    expect(result.success).toBe(false);
  });
});

describe("searchEntrySchema", () => {
  it("空オブジェクトを受け付ける (全フィールド省略可能)", () => {
    const result = searchEntrySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.page).toBe(1);
  });

  it("page を文字列から数値に coerce する", () => {
    const result = searchEntrySchema.safeParse({ page: "3" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.page).toBe(3);
  });

  it("dateFrom > dateTo のときは失敗する", () => {
    const result = searchEntrySchema.safeParse({
      dateFrom: "2026-04-30",
      dateTo: "2026-04-01",
    });
    expect(result.success).toBe(false);
  });

  it("dateFrom === dateTo は有効", () => {
    const result = searchEntrySchema.safeParse({
      dateFrom: "2026-04-27",
      dateTo: "2026-04-27",
    });
    expect(result.success).toBe(true);
  });

  it("dateFrom < dateTo は有効", () => {
    const result = searchEntrySchema.safeParse({
      dateFrom: "2026-04-01",
      dateTo: "2026-04-30",
    });
    expect(result.success).toBe(true);
  });

  it("q が 200 文字を超えると失敗する", () => {
    const result = searchEntrySchema.safeParse({ q: "a".repeat(201) });
    expect(result.success).toBe(false);
  });
});
