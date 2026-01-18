/*
  Warnings:

  - The `mentions` column on the `comments` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "comments" DROP COLUMN "mentions",
ADD COLUMN     "mentions" JSONB[] DEFAULT ARRAY[]::JSONB[];
