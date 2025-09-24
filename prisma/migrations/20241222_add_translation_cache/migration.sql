-- CreateTable
CREATE TABLE "translation_cache" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_text" TEXT NOT NULL,
    "source_language" TEXT NOT NULL,
    "target_language" TEXT NOT NULL,
    "translated_text" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "quality" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "use_count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "translation_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "translation_cache_source_text_source_language_target_langua_key" ON "translation_cache"("source_text", "source_language", "target_language");

-- CreateIndex
CREATE INDEX "translation_cache_source_language_target_language_idx" ON "translation_cache"("source_language", "target_language");

-- CreateIndex
CREATE INDEX "translation_cache_last_used_idx" ON "translation_cache"("last_used");