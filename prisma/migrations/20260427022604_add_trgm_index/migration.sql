-- 日本語の本文・タグ名の部分一致検索を高速化するため pg_trgm + GIN trigram インデックスを追加。
-- 標準の tsvector は日本語トークナイズが弱いので、まずはトライグラム索引で ILIKE '%...%' を効かせる。
-- 性能不足になったら pg_bigm / pgroonga への置き換えを検討する。

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Entry_body_trgm_idx"
  ON "Entry"
  USING GIN (body gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Tag_name_trgm_idx"
  ON "Tag"
  USING GIN (name gin_trgm_ops);
