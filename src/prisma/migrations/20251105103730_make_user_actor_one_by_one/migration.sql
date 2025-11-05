/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `actor` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "actor_userId_key" ON "actor"("userId");
