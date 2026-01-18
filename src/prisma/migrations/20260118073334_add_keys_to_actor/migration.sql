/*
  Warnings:

  - The primary key for the `keys` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `userId` on the `keys` table. All the data in the column will be lost.
  - Made the column `actorId` on table `keys` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."keys" DROP CONSTRAINT "keys_actorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."keys" DROP CONSTRAINT "keys_userId_fkey";

-- AlterTable
ALTER TABLE "keys" DROP CONSTRAINT "keys_pkey",
DROP COLUMN "userId",
ALTER COLUMN "actorId" SET NOT NULL,
ADD CONSTRAINT "keys_pkey" PRIMARY KEY ("actorId", "type");

-- AddForeignKey
ALTER TABLE "keys" ADD CONSTRAINT "keys_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
