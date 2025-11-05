/*
  Warnings:

  - A unique constraint covering the columns `[avatarId]` on the table `actor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[bannerId]` on the table `actor` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."image" DROP CONSTRAINT "image_actorId_fkey";

-- AlterTable
ALTER TABLE "actor" ADD COLUMN     "avatarId" TEXT,
ADD COLUMN     "bannerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "actor_avatarId_key" ON "actor"("avatarId");

-- CreateIndex
CREATE UNIQUE INDEX "actor_bannerId_key" ON "actor"("bannerId");

-- AddForeignKey
ALTER TABLE "actor" ADD CONSTRAINT "actor_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actor" ADD CONSTRAINT "actor_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "image"("id") ON DELETE SET NULL ON UPDATE CASCADE;
