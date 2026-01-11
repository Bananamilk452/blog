/*
  Warnings:

  - Added the required column `username` to the `actor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "actor" ADD COLUMN     "username" TEXT NOT NULL;