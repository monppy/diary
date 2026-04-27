import { prisma } from "@/lib/db/prisma";
import type { CreateTagInput } from "@/lib/validators/tag";

export type TagItem = { id: string; name: string };

export async function listTags(userId: string): Promise<TagItem[]> {
  return prisma.tag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function createTag(
  userId: string,
  input: CreateTagInput,
): Promise<TagItem> {
  return prisma.tag.upsert({
    where: { userId_name: { userId, name: input.name } },
    update: {},
    create: { userId, name: input.name },
    select: { id: true, name: true },
  });
}
