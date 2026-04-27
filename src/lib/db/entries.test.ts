import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  getEntry,
  listEntries,
  deleteEntry,
  createEntry,
  searchEntries,
} from "./entries";

// Prisma クライアント全体をモック
vi.mock("@/lib/db/prisma", () => {
  const mockTx = {
    entry: {
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    tag: { upsert: vi.fn() },
    entryTag: { deleteMany: vi.fn(), createMany: vi.fn() },
  };

  return {
    prisma: {
      entry: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      tag: {
        upsert: vi.fn(),
        findMany: vi.fn(),
      },
      entryTag: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      $transaction: vi.fn((arg: unknown) => {
        if (typeof arg === "function") return arg(mockTx);
        if (Array.isArray(arg)) return Promise.all(arg);
        return Promise.resolve();
      }),
      _mockTx: mockTx,
    },
  };
});

// テスト用のダミーデータ
const USER_ID = "user-abc";
const OTHER_USER_ID = "user-xyz";
const ENTRY_ID = "entry-1";

const mockRawEntry = {
  id: ENTRY_ID,
  userId: USER_ID,
  entryDate: new Date("2026-04-27"),
  body: "今日の振り返り",
  mode: "FREE" as const,
  templateKey: null,
  createdAt: new Date("2026-04-27"),
  updatedAt: new Date("2026-04-27"),
  tags: [{ tag: { name: "仕事" } }, { tag: { name: "趣味" } }],
};

// Prisma モック参照ヘルパー
const mockPrisma = prisma as typeof prisma & {
  _mockTx: {
    entry: { create: ReturnType<typeof vi.fn>; findUniqueOrThrow: ReturnType<typeof vi.fn> };
    tag: { upsert: ReturnType<typeof vi.fn> };
    entryTag: { deleteMany: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn> };
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ------------------------------------------------------------------
// getEntry
// ------------------------------------------------------------------
describe("getEntry", () => {
  it("エントリが存在しない場合は null を返す", async () => {
    vi.mocked(prisma.entry.findUnique).mockResolvedValueOnce(null);
    const result = await getEntry(USER_ID, ENTRY_ID);
    expect(result).toBeNull();
  });

  it("userId が一致しない場合は null を返す (認可チェック)", async () => {
    vi.mocked(prisma.entry.findUnique).mockResolvedValueOnce({
      ...mockRawEntry,
      userId: OTHER_USER_ID,
    } as never);
    const result = await getEntry(USER_ID, ENTRY_ID);
    expect(result).toBeNull();
  });

  it("成功時はフラットな EntryWithTags を返す", async () => {
    vi.mocked(prisma.entry.findUnique).mockResolvedValueOnce(
      mockRawEntry as never,
    );
    const result = await getEntry(USER_ID, ENTRY_ID);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(ENTRY_ID);
    expect(result?.tagNames).toEqual(["仕事", "趣味"]);
    expect(result).not.toHaveProperty("tags"); // ネスト構造は含まない
  });

  it("entryId を引数に findUnique を呼ぶ", async () => {
    vi.mocked(prisma.entry.findUnique).mockResolvedValueOnce(
      mockRawEntry as never,
    );
    await getEntry(USER_ID, ENTRY_ID);
    expect(vi.mocked(prisma.entry.findUnique)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ENTRY_ID } }),
    );
  });
});

// ------------------------------------------------------------------
// deleteEntry
// ------------------------------------------------------------------
describe("deleteEntry", () => {
  it("エントリが存在しない場合は false を返す", async () => {
    vi.mocked(prisma.entry.findUnique).mockResolvedValueOnce(null);
    const result = await deleteEntry(USER_ID, ENTRY_ID);
    expect(result).toBe(false);
    expect(vi.mocked(prisma.entry.delete)).not.toHaveBeenCalled();
  });

  it("userId が一致しない場合は false を返す (認可チェック)", async () => {
    vi.mocked(prisma.entry.findUnique).mockResolvedValueOnce({
      ...mockRawEntry,
      userId: OTHER_USER_ID,
    } as never);
    const result = await deleteEntry(USER_ID, ENTRY_ID);
    expect(result).toBe(false);
    expect(vi.mocked(prisma.entry.delete)).not.toHaveBeenCalled();
  });

  it("成功時は true を返し delete を呼ぶ", async () => {
    vi.mocked(prisma.entry.findUnique).mockResolvedValueOnce(
      mockRawEntry as never,
    );
    vi.mocked(prisma.entry.delete).mockResolvedValueOnce(undefined as never);
    const result = await deleteEntry(USER_ID, ENTRY_ID);
    expect(result).toBe(true);
    expect(vi.mocked(prisma.entry.delete)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ENTRY_ID } }),
    );
  });
});

// ------------------------------------------------------------------
// listEntries
// ------------------------------------------------------------------
describe("listEntries", () => {
  it("エントリ一覧と件数を返す", async () => {
    vi.mocked(prisma.entry.findMany).mockResolvedValueOnce(
      [mockRawEntry] as never,
    );
    vi.mocked(prisma.entry.count).mockResolvedValueOnce(1 as never);

    const result = await listEntries(USER_ID, 1);

    expect(result.entries).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.hasMore).toBe(false);
    expect(result.entries[0].tagNames).toEqual(["仕事", "趣味"]);
  });

  it("hasMore は page * PAGE_SIZE < total のとき true", async () => {
    // PAGE_SIZE = 20, page = 1, total = 25 → hasMore = true
    vi.mocked(prisma.entry.findMany).mockResolvedValueOnce(
      Array(20).fill(mockRawEntry) as never,
    );
    vi.mocked(prisma.entry.count).mockResolvedValueOnce(25 as never);

    const result = await listEntries(USER_ID, 1);

    expect(result.hasMore).toBe(true);
  });

  it("userId で絞り込む", async () => {
    vi.mocked(prisma.entry.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.entry.count).mockResolvedValueOnce(0 as never);

    await listEntries(USER_ID, 1);

    expect(vi.mocked(prisma.entry.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } }),
    );
  });
});

// ------------------------------------------------------------------
// createEntry
// ------------------------------------------------------------------
describe("createEntry", () => {
  it("タグ付きでエントリを作成し EntryWithTags を返す", async () => {
    const createdEntry = { ...mockRawEntry, tags: [] };
    const entryWithTags = { ...mockRawEntry, tags: [{ tag: { name: "仕事" } }] };

    mockPrisma._mockTx.entry.create.mockResolvedValueOnce(createdEntry);
    mockPrisma._mockTx.tag.upsert.mockResolvedValueOnce({ id: "tag-1" });
    mockPrisma._mockTx.entryTag.deleteMany.mockResolvedValueOnce(undefined);
    mockPrisma._mockTx.entryTag.createMany.mockResolvedValueOnce(undefined);
    mockPrisma._mockTx.entry.findUniqueOrThrow.mockResolvedValueOnce(
      entryWithTags,
    );

    const result = await createEntry(USER_ID, {
      entryDate: "2026-04-27",
      body: "テスト本文",
      mode: "FREE",
      tagNames: ["仕事"],
    });

    expect(result.tagNames).toEqual(["仕事"]);
    expect(mockPrisma._mockTx.entry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: USER_ID, body: "テスト本文" }),
      }),
    );
  });

  it("タグなしでエントリを作成できる", async () => {
    const createdEntry = { ...mockRawEntry, tags: [] };

    mockPrisma._mockTx.entry.create.mockResolvedValueOnce(createdEntry);
    mockPrisma._mockTx.entryTag.deleteMany.mockResolvedValueOnce(undefined);
    mockPrisma._mockTx.entry.findUniqueOrThrow.mockResolvedValueOnce({
      ...mockRawEntry,
      tags: [],
    });

    const result = await createEntry(USER_ID, {
      entryDate: "2026-04-27",
      body: "テスト本文",
      mode: "FREE",
      tagNames: [],
    });

    expect(result.tagNames).toEqual([]);
    expect(mockPrisma._mockTx.tag.upsert).not.toHaveBeenCalled();
  });
});

// ------------------------------------------------------------------
// searchEntries
// ------------------------------------------------------------------
describe("searchEntries", () => {
  it("検索結果と件数を返す", async () => {
    vi.mocked(prisma.entry.findMany).mockResolvedValueOnce(
      [mockRawEntry] as never,
    );
    vi.mocked(prisma.entry.count).mockResolvedValueOnce(1 as never);

    const result = await searchEntries(USER_ID, { page: 1 });

    expect(result.entries).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("キーワードで body を絞り込む", async () => {
    vi.mocked(prisma.entry.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.entry.count).mockResolvedValueOnce(0 as never);

    await searchEntries(USER_ID, { q: "振り返り", page: 1 });

    expect(vi.mocked(prisma.entry.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          body: { contains: "振り返り", mode: "insensitive" },
        }),
      }),
    );
  });

  it("タグ名で絞り込む", async () => {
    vi.mocked(prisma.entry.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.entry.count).mockResolvedValueOnce(0 as never);

    await searchEntries(USER_ID, { tagNames: ["仕事"], page: 1 });

    expect(vi.mocked(prisma.entry.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tags: { some: { tag: { name: { in: ["仕事"] } } } },
        }),
      }),
    );
  });

  it("日付範囲で絞り込む", async () => {
    vi.mocked(prisma.entry.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.entry.count).mockResolvedValueOnce(0 as never);

    await searchEntries(USER_ID, {
      dateFrom: "2026-04-01",
      dateTo: "2026-04-30",
      page: 1,
    });

    expect(vi.mocked(prisma.entry.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          entryDate: {
            gte: new Date("2026-04-01"),
            lte: new Date("2026-04-30"),
          },
        }),
      }),
    );
  });
});
