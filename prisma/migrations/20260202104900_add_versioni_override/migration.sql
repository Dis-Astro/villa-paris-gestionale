-- CreateTable
CREATE TABLE "VersioneEvento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventoId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "watermark" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "hash" TEXT,
    "autore" TEXT,
    "commento" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VersioneEvento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OverrideLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventoId" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "autore" TEXT,
    "campoModificato" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OverrideLog_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "VersioneEvento_eventoId_idx" ON "VersioneEvento"("eventoId");

-- CreateIndex
CREATE INDEX "OverrideLog_eventoId_idx" ON "OverrideLog"("eventoId");
