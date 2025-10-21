-- CreateTable
CREATE TABLE "actor" (
    "id" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "name" TEXT,
    "inboxUrl" TEXT NOT NULL,
    "shared_inbox_url" TEXT,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "actor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "actor_uri_key" ON "actor"("uri");

-- CreateIndex
CREATE UNIQUE INDEX "actor_handle_key" ON "actor"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "actor_inboxUrl_key" ON "actor"("inboxUrl");

-- AddForeignKey
ALTER TABLE "actor" ADD CONSTRAINT "actor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
