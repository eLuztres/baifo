-- A product's name and description in other languages ({ "en": { "name": "…", "description": "…" } }).
ALTER TABLE "Product" ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}';
