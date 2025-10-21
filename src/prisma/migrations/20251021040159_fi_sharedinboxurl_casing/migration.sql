/*
  Warnings:

  - You are about to drop the column `shared_inbox_url` on the `actor` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "actor" DROP COLUMN "shared_inbox_url",
ADD COLUMN     "sharedInboxUrl" TEXT;
