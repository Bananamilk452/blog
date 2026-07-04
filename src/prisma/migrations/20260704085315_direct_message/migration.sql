-- CreateTable
CREATE TABLE "direct_messages" (
    "id" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "url" TEXT,
    "to" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cc" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mentions" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "replyTargetUri" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'incoming',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_message_attachment" (
    "id" TEXT NOT NULL,
    "directMessageId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mediaType" TEXT,
    "name" TEXT,
    "sensitive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_message_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "direct_messages_uri_key" ON "direct_messages"("uri");

-- CreateIndex
CREATE INDEX "direct_messages_actorId_idx" ON "direct_messages"("actorId");

-- CreateIndex
CREATE INDEX "direct_messages_direction_idx" ON "direct_messages"("direction");

-- CreateIndex
CREATE INDEX "direct_messages_createdAt_idx" ON "direct_messages"("createdAt");

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_message_attachment" ADD CONSTRAINT "direct_message_attachment_directMessageId_fkey" FOREIGN KEY ("directMessageId") REFERENCES "direct_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
