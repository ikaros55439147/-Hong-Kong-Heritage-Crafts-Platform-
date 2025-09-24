-- CreateTable
CREATE TABLE "user_behavior_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "metadata" JSONB,
    "session_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_behavior_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_queries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "query" TEXT NOT NULL,
    "results_count" INTEGER NOT NULL DEFAULT 0,
    "clicked_result_id" UUID,
    "clicked_result_type" VARCHAR(50),
    "session_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_feedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "recommendation_id" UUID NOT NULL,
    "recommendation_type" VARCHAR(50) NOT NULL,
    "feedback_type" VARCHAR(50) NOT NULL, -- 'like', 'dislike', 'not_interested', 'clicked'
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_behavior_events_user_id_idx" ON "user_behavior_events"("user_id");
CREATE INDEX "user_behavior_events_entity_idx" ON "user_behavior_events"("entity_type", "entity_id");
CREATE INDEX "user_behavior_events_event_type_idx" ON "user_behavior_events"("event_type");
CREATE INDEX "user_behavior_events_created_at_idx" ON "user_behavior_events"("created_at");
CREATE INDEX "user_behavior_events_session_idx" ON "user_behavior_events"("session_id");

CREATE INDEX "search_queries_user_id_idx" ON "search_queries"("user_id");
CREATE INDEX "search_queries_query_idx" ON "search_queries"("query");
CREATE INDEX "search_queries_created_at_idx" ON "search_queries"("created_at");

CREATE INDEX "recommendation_feedback_user_id_idx" ON "recommendation_feedback"("user_id");
CREATE INDEX "recommendation_feedback_recommendation_idx" ON "recommendation_feedback"("recommendation_id", "recommendation_type");
CREATE INDEX "recommendation_feedback_feedback_type_idx" ON "recommendation_feedback"("feedback_type");

-- Add foreign key constraints
ALTER TABLE "user_behavior_events" ADD CONSTRAINT "user_behavior_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "search_queries" ADD CONSTRAINT "search_queries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;