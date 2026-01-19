-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "mentions" TEXT[] DEFAULT ARRAY[]::TEXT[];
