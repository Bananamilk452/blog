/*
  Warnings:

  - A unique constraint covering the columns `[uri]` on the table `posts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `uri` to the `posts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "uri" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "posts_uri_key" ON "posts"("uri");
