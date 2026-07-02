-- CreateTable
CREATE TABLE "reactions" (
    "id" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "targetUri" TEXT NOT NULL,
    "to" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cc" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emojiName" TEXT,
    "emojiIconUrl" TEXT,
    "emojiIconMediaType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reactions_uri_key" ON "reactions"("uri");

-- CreateIndex
CREATE UNIQUE INDEX "reactions_actorId_postId_content_key" ON "reactions"("actorId", "postId", "content");

-- CreateIndex
CREATE UNIQUE INDEX "reactions_actorId_commentId_content_key" ON "reactions"("actorId", "commentId", "content");

-- CreateIndex
CREATE INDEX "reactions_targetUri_idx" ON "reactions"("targetUri");

-- CreateIndex
CREATE INDEX "reactions_activityType_idx" ON "reactions"("activityType");

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
