import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// CLAUDE.md の規約に従い .env.local から読み込む (Next.js と整合)
loadEnv({ path: ".env.local" });

// Supabase + Prisma 7 構成:
// - migrate (このファイルが管轄) には DDL を流せる直接接続が必要 → DIRECT_URL を使う
// - runtime クエリは PrismaClient + adapter で別途 DATABASE_URL (pooled) を使う
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
