-- CreateTable
CREATE TABLE "Keys" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Keys_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "Keys" ADD CONSTRAINT "Keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
