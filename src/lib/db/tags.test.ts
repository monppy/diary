import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { listTags, createTag } from "./tags";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tag: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

const USER_ID = "user-abc";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listTags", () => {
  it("userId で絞り込んだタグ一覧を返す", async () => {
    const mockTags = [
      { id: "tag-1", name: "仕事" },
      { id: "tag-2", name: "趣味" },
    ];
    vi.mocked(prisma.tag.findMany).mockResolvedValueOnce(mockTags as never);

    const result = await listTags(USER_ID);

    expect(result).toEqual(mockTags);
    expect(vi.mocked(prisma.tag.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } }),
    );
  });

  it("タグが 0 件でも空配列を返す", async () => {
    vi.mocked(prisma.tag.findMany).mockResolvedValueOnce([] as never);
    const result = await listTags(USER_ID);
    expect(result).toEqual([]);
  });
});

describe("createTag", () => {
  it("新しいタグを upsert して返す", async () => {
    const mockTag = { id: "tag-1", name: "仕事" };
    vi.mocked(prisma.tag.upsert).mockResolvedValueOnce(mockTag as never);

    const result = await createTag(USER_ID, { name: "仕事" });

    expect(result).toEqual(mockTag);
    expect(vi.mocked(prisma.tag.upsert)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_name: { userId: USER_ID, name: "仕事" } },
        create: { userId: USER_ID, name: "仕事" },
      }),
    );
  });

  it("同名タグが存在しても upsert で冪等に動く", async () => {
    const existing = { id: "tag-1", name: "仕事" };
    vi.mocked(prisma.tag.upsert).mockResolvedValueOnce(existing as never);

    const result = await createTag(USER_ID, { name: "仕事" });

    expect(result).toEqual(existing);
    expect(vi.mocked(prisma.tag.upsert)).toHaveBeenCalledTimes(1);
  });
});
