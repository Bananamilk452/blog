/*
  Warnings:

  - Added the required column `originalUrl` to the `avatar` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "avatar" ADD COLUMN     "originalUrl" TEXT NOT NULL;
