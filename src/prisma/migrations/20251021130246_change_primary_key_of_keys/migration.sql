/*
  Warnings:

  - The primary key for the `Keys` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "Keys" DROP CONSTRAINT "Keys_pkey",
ADD CONSTRAINT "Keys_pkey" PRIMARY KEY ("userId", "type");
