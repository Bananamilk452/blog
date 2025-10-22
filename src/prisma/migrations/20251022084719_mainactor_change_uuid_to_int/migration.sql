/*
  Warnings:

  - The primary key for the `main_actor` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `main_actor` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "main_actor" DROP CONSTRAINT "main_actor_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "main_actor_pkey" PRIMARY KEY ("id");
