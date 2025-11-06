/*
  Warnings:

  - A unique constraint covering the columns `[bannerId]` on the table `posts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "bannerId" TEXT,
ALTER COLUMN "slug" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "posts_bannerId_key" ON "posts"("bannerId");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "image"("id") ON DELETE SET NULL ON UPDATE CASCADE;
