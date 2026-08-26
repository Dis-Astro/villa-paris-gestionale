-- Sessioni native revocabili: nel database viene conservato soltanto l'hash del refresh token.
CREATE TABLE "MobileSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "deviceName" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MobileSession_refreshTokenHash_key" ON "MobileSession"("refreshTokenHash");
CREATE INDEX "MobileSession_userId_revokedAt_idx" ON "MobileSession"("userId", "revokedAt");
CREATE INDEX "MobileSession_expiresAt_idx" ON "MobileSession"("expiresAt");

ALTER TABLE "MobileSession"
ADD CONSTRAINT "MobileSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
