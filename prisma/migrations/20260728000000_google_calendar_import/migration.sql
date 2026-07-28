CREATE TABLE "GoogleCalendarImport" (
    "id" SERIAL NOT NULL,
    "gcalEventId" TEXT NOT NULL,
    "recurringEventId" TEXT,
    "iCalUID" TEXT,
    "tipoRisorsa" TEXT NOT NULL,
    "risorsaId" INTEGER,
    "stato" TEXT NOT NULL DEFAULT 'imported',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fingerprint" TEXT,
    "rawData" TEXT NOT NULL,
    "warning" TEXT,
    "aiStatus" TEXT DEFAULT 'pending',
    "aiAnalyzedAt" TIMESTAMP(3),
    "firstImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GoogleCalendarImport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GoogleCalendarImport_gcalEventId_key" ON "GoogleCalendarImport"("gcalEventId");
CREATE INDEX "GoogleCalendarImport_tipoRisorsa_risorsaId_idx" ON "GoogleCalendarImport"("tipoRisorsa", "risorsaId");
CREATE INDEX "GoogleCalendarImport_stato_idx" ON "GoogleCalendarImport"("stato");
CREATE INDEX "GoogleCalendarImport_iCalUID_idx" ON "GoogleCalendarImport"("iCalUID");
CREATE INDEX "GoogleCalendarImport_lastImportedAt_idx" ON "GoogleCalendarImport"("lastImportedAt");

CREATE TABLE "AiOperation" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "operationType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputData" TEXT,
    "outputData" TEXT,
    "proposedChanges" TEXT,
    "appliedChanges" TEXT,
    "confidence" DOUBLE PRECISION,
    "requiresReview" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AiOperation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiOperation_sourceType_sourceId_idx" ON "AiOperation"("sourceType", "sourceId");
CREATE INDEX "AiOperation_status_idx" ON "AiOperation"("status");
CREATE INDEX "AiOperation_createdAt_idx" ON "AiOperation"("createdAt");
