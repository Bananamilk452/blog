-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "cc" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "to" TEXT[] DEFAULT ARRAY[]::TEXT[];
