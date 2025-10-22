/*
  Warnings:

  - You are about to drop the `Keys` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Keys" DROP CONSTRAINT "Keys_userId_fkey";

-- DropTable
DROP TABLE "public"."Keys";

-- CreateTable
CREATE TABLE "keys" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keys_pkey" PRIMARY KEY ("userId","type")
);

-- AddForeignKey
ALTER TABLE "keys" ADD CONSTRAINT "keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
