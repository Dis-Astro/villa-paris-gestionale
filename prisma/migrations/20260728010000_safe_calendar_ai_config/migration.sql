ALTER TABLE "GoogleCalendarImport"
ADD COLUMN "createdResource" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "AiConfiguration" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "model" TEXT NOT NULL DEFAULT 'gpt-5.6-terra',
    "baseUrl" TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
    "apiKeyEncrypted" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "autoApply" BOOLEAN NOT NULL DEFAULT false,
    "minConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "includePersonalData" BOOLEAN NOT NULL DEFAULT false,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConfiguration_pkey" PRIMARY KEY ("id")
);
