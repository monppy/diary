import { describe, it, expect } from "vitest";
import { createTagSchema } from "./tag";

describe("createTagSchema", () => {
  it("有効なタグ名を受け付ける", () => {
    const result = createTagSchema.safeParse({ name: "仕事" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("仕事");
  });

  it("先頭の # を除去する", () => {
    expect(createTagSchema.safeParse({ name: "#仕事" }).data?.name).toBe("仕事");
    expect(createTagSchema.safeParse({ name: "##仕事" }).data?.name).toBe("仕事");
  });

  it("前後の空白をトリムする", () => {
    const result = createTagSchema.safeParse({ name: "  仕事  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("仕事");
  });

  it("空文字は失敗する", () => {
    expect(createTagSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("# だけは失敗する", () => {
    expect(createTagSchema.safeParse({ name: "#" }).success).toBe(false);
    expect(createTagSchema.safeParse({ name: "##" }).success).toBe(false);
  });

  it("51 文字以上は失敗する", () => {
    const result = createTagSchema.safeParse({ name: "a".repeat(51) });
    expect(result.success).toBe(false);
  });

  it("50 文字はギリギリ有効", () => {
    const result = createTagSchema.safeParse({ name: "a".repeat(50) });
    expect(result.success).toBe(true);
  });
});
