CREATE TABLE "inbox_activity_log" (
    "id" TEXT NOT NULL,
    "activityId" TEXT,
    "activityType" TEXT NOT NULL,
    "actorUri" TEXT,
    "objectId" TEXT,
    "rawJson" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handledAt" TIMESTAMP(3),

    CONSTRAINT "inbox_activity_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inbox_activity_log_activityId_idx" ON "inbox_activity_log"("activityId");
CREATE INDEX "inbox_activity_log_activityType_idx" ON "inbox_activity_log"("activityType");
CREATE INDEX "inbox_activity_log_actorUri_idx" ON "inbox_activity_log"("actorUri");
CREATE INDEX "inbox_activity_log_status_idx" ON "inbox_activity_log"("status");
CREATE INDEX "inbox_activity_log_receivedAt_idx" ON "inbox_activity_log"("receivedAt");
