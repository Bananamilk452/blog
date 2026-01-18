-- AlterTable
ALTER TABLE "keys" ADD COLUMN     "actorId" TEXT;

-- AddForeignKey
ALTER TABLE "keys" ADD CONSTRAINT "keys_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
