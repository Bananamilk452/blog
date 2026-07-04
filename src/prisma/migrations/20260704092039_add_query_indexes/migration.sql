-- CreateIndex
CREATE INDEX "comments_postId_createdAt_idx" ON "comments"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "comments_createdAt_idx" ON "comments"("createdAt");

-- CreateIndex
CREATE INDEX "follows_followerId_idx" ON "follows"("followerId");

-- CreateIndex
CREATE INDEX "posts_state_createdAt_idx" ON "posts"("state", "createdAt");

-- CreateIndex
CREATE INDEX "posts_state_publishedAt_idx" ON "posts"("state", "publishedAt");
