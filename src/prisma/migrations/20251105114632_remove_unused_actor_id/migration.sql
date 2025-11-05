/*
  Warnings:

  - You are about to drop the column `actorId` on the `image` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `image` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."image_actorId_key";

-- AlterTable
ALTER TABLE "image" DROP COLUMN "actorId",
DROP COLUMN "createdAt";
