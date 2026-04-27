import type { Prisma } from "@/generated/prisma/client";
import type { EntryMode } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import type {
  CreateEntryInput,
  SearchEntryInput,
  UpdateEntryInput,
} from "@/lib/validators/entry";

const PAGE_SIZE = 20;

// Prisma のネスト結果を DB 層の公開型にフラット化した型
type RawEntry = {
  id: string;
  userId: string;
  entryDate: Date;
  body: string;
  mode: EntryMode;
  templateKey: string | null;
  createdAt: Date;
  updatedAt: Date;
  tags: Array<{ tag: { name: string } }>;
};

export type EntryWithTags = Omit<RawEntry, "tags"> & { tagNames: string[] };

export type EntryPage = {
  entries: EntryWithTags[];
  total: number;
  hasMore: boolean;
};

function toEntryWithTags(raw: RawEntry): EntryWithTags {
  const { tags, ...rest } = raw;
  return { ...rest, tagNames: tags.map((t) => t.tag.name) };
}

// タグ名を upsert してエントリに紐づける (トランザクション内専用)
async function syncEntryTags(
  tx: Prisma.TransactionClient,
  userId: string,
  entryId: string,
  tagNames: string[],
): Promise<void> {
  await tx.entryTag.deleteMany({ where: { entryId } });
  if (tagNames.length === 0) return;

  const tags = await Promise.all(
    tagNames.map((name) =>
      tx.tag.upsert({
        where: { userId_name: { userId, name } },
        update: {},
        create: { userId, name },
        select: { id: true },
      }),
    ),
  );
  await tx.entryTag.createMany({
    data: tags.map((t) => ({ entryId, tagId: t.id })),
  });
}

const tagInclude = {
  tags: { include: { tag: { select: { name: true } } } },
} as const;

// ------------------------------------------------------------------

export async function createEntry(
  userId: string,
  input: CreateEntryInput,
): Promise<EntryWithTags> {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.entry.create({
      data: {
        userId,
        entryDate: new Date(input.entryDate),
        body: input.body,
        mode: input.mode,
        templateKey: input.templateKey ?? null,
      },
      include: tagInclude,
    });
    await syncEntryTags(tx, userId, entry.id, input.tagNames ?? []);
    // タグ追加後に再取得して最新状態を返す
    const updated = await tx.entry.findUniqueOrThrow({
      where: { id: entry.id },
      include: tagInclude,
    });
    return toEntryWithTags(updated as RawEntry);
  });
}

export async function getEntry(
  userId: string,
  id: string,
): Promise<EntryWithTags | null> {
  const entry = await prisma.entry.findUnique({
    where: { id },
    include: tagInclude,
  });
  if (!entry || entry.userId !== userId) return null;
  return toEntryWithTags(entry as RawEntry);
}

export async function listEntries(
  userId: string,
  page = 1,
): Promise<EntryPage> {
  const [entries, total] = await prisma.$transaction([
    prisma.entry.findMany({
      where: { userId },
      orderBy: { entryDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: tagInclude,
    }),
    prisma.entry.count({ where: { userId } }),
  ]);
  return {
    entries: (entries as RawEntry[]).map(toEntryWithTags),
    total,
    hasMore: page * PAGE_SIZE < total,
  };
}

export async function updateEntry(
  userId: string,
  id: string,
  input: UpdateEntryInput,
): Promise<EntryWithTags | null> {
  const existing = await prisma.entry.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return null;

  return prisma.$transaction(async (tx) => {
    if (input.tagNames !== undefined) {
      await syncEntryTags(tx, userId, id, input.tagNames);
    }
    const updated = await tx.entry.update({
      where: { id },
      data: {
        ...(input.body !== undefined && { body: input.body }),
        ...(input.mode !== undefined && { mode: input.mode }),
        ...(input.templateKey !== undefined && {
          templateKey: input.templateKey,
        }),
      },
      include: tagInclude,
    });
    return toEntryWithTags(updated as RawEntry);
  });
}

export async function deleteEntry(
  userId: string,
  id: string,
): Promise<boolean> {
  const existing = await prisma.entry.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return false;
  await prisma.entry.delete({ where: { id } });
  return true;
}

export async function searchEntries(
  userId: string,
  input: SearchEntryInput,
): Promise<EntryPage> {
  const where: Prisma.EntryWhereInput = {
    userId,
    ...(input.q && {
      // pg_trgm GIN インデックスが ILIKE '%...%' で効く
      body: { contains: input.q, mode: "insensitive" },
    }),
    ...(input.tagNames?.length && {
      tags: { some: { tag: { name: { in: input.tagNames } } } },
    }),
    ...((input.dateFrom || input.dateTo) && {
      entryDate: {
        ...(input.dateFrom && { gte: new Date(input.dateFrom) }),
        ...(input.dateTo && { lte: new Date(input.dateTo) }),
      },
    }),
  };

  const [entries, total] = await prisma.$transaction([
    prisma.entry.findMany({
      where,
      orderBy: { entryDate: "desc" },
      skip: (input.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: tagInclude,
    }),
    prisma.entry.count({ where }),
  ]);

  return {
    entries: (entries as RawEntry[]).map(toEntryWithTags),
    total,
    hasMore: input.page * PAGE_SIZE < total,
  };
}
