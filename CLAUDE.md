@AGENTS.md

# 日記アプリ (my-diary) — CLAUDE.md

## プロジェクト概要

個人用の日記アプリ。振り返り習慣を作り、同じミスを繰り返さないようにする。
ユーザーは自分一人。個人利用のみ。

目的:
- 日々の出来事・気づきを手軽に記録する
- 過去の日記を検索・閲覧して振り返れるようにする
- タグやテンプレートで構造化できるようにする

## 技術スタック

| 領域 | 採用技術 |
|------|---------|
| フレームワーク | Next.js 16 (App Router) + TypeScript (strict) |
| スタイル | Tailwind CSS v4 + shadcn/ui |
| DB | Supabase (PostgreSQL) + Prisma ORM |
| ユニットテスト | Vitest |
| E2Eテスト | Playwright |
| パッケージマネージャ | pnpm (必須) |
| 認証 | Supabase Auth (メールリンクログイン) |

## コーディング規約

- TypeScript strict mode 必須、`any` 禁止
- Server Components 優先、必要なときだけ `"use client"`
- DBアクセスは `src/lib/db/` に集約 (ページやコンポーネントに直接書かない)
- ZodでAPI入力・Server Action入力をバリデーション
- 日本語コメントOK、変数名・関数名は英語
- 1ファイル200行以内が目安。超えそうなら分割を検討
- `import type` を使って型のみのインポートを明示する

## ディレクトリ構成

```
src/
  app/                  # ページ (App Router)
    (auth)/             # 認証関連ページ
    entries/            # 日記一覧・詳細
    new/                # 新規作成
    search/             # 検索
  components/
    ui/                 # shadcn/ui コンポーネント (自動生成、編集しない)
    diary/              # 日記アプリ固有のコンポーネント
  lib/
    db/                 # データアクセス層 (Prismaクライアント呼び出し)
    validators/         # Zodスキーマ
    types/              # 共通型定義
    utils/              # 汎用ユーティリティ
  actions/              # Server Actions
prisma/
  schema.prisma
```

新しいディレクトリを作る前に、この構成に合うか確認する。

## テスト方針

- 重要なロジック(DB操作、バリデーション、ユーティリティ)は **Vitest で必ずテスト**
- 主要ユーザーフロー(日記を書く→見返す→検索する)は **Playwright でE2E**
- 実装サイクル: `ファイル編集 → pnpm test → 失敗を見て修正` のループを回す
- テストを先に書いてから実装するTDDを推奨
- テストファイルは対象ファイルと同じディレクトリに置く (`*.test.ts`)

## やってはいけないこと

- `prisma migrate reset` などDBを破壊するコマンドを勝手に実行しない
- `.env` の認証情報をコードにハードコードしない
- `npm` や `yarn` を使わない。**pnpm のみ**
- `any` 型を使わない。不明な型は `unknown` + type guard で対処
- `"use client"` を安易に付けない。Server Componentで解決できないか先に考える
- shadcn/ui の `src/components/ui/` 内のファイルを直接編集しない

## 完了の定義

タスクが「できた」と言う前に必ず以下を確認:

1. `pnpm typecheck` がパス (`tsc --noEmit`)
2. `pnpm lint` がパス
3. 関連するテスト (`pnpm test`) がパス
4. ブラウザで動作確認済み (UIの変更がある場合)

## 環境変数

`.env.local` に以下を設定 (コードには絶対に書かない):

```
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## よく使うコマンド

```bash
pnpm dev              # 開発サーバー起動
pnpm build            # 本番ビルド
pnpm typecheck        # 型チェック
pnpm lint             # Lintチェック
pnpm test             # Vitestユニットテスト
pnpm test:e2e         # PlaywrightのE2Eテスト
pnpm prisma studio    # Prismaのデータ確認GUI
pnpm prisma migrate dev --name <name>  # マイグレーション作成・適用
```
