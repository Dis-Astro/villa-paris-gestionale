-- CreateTable
CREATE TABLE "Evento" (
    "id" SERIAL NOT NULL,
    "titolo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "dataConfermata" TIMESTAMP(3),
    "fascia" TEXT NOT NULL,
    "stato" TEXT NOT NULL,
    "personePreviste" INTEGER,
    "note" TEXT,
    "menu" JSONB,
    "struttura" JSONB,
    "dateProposte" JSONB,
    "disposizioneSala" JSONB,
    "luogo" TEXT,
    "prezzo" DOUBLE PRECISION,
    "menuPasto" TEXT,
    "menuBuffet" TEXT,
    "sposa" TEXT,
    "sposo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersioneEvento" (
    "id" TEXT NOT NULL,
    "eventoId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "watermark" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "hash" TEXT,
    "autore" TEXT,
    "commento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VersioneEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OverrideLog" (
    "id" TEXT NOT NULL,
    "eventoId" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "autore" TEXT,
    "campoModificato" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OverrideLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuBase" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "struttura" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cognome" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoCliente" (
    "id" SERIAL NOT NULL,
    "eventoId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,

    CONSTRAINT "EventoCliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VersioneEvento_eventoId_idx" ON "VersioneEvento"("eventoId");

-- CreateIndex
CREATE INDEX "OverrideLog_eventoId_idx" ON "OverrideLog"("eventoId");

-- AddForeignKey
ALTER TABLE "VersioneEvento" ADD CONSTRAINT "VersioneEvento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OverrideLog" ADD CONSTRAINT "OverrideLog_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoCliente" ADD CONSTRAINT "EventoCliente_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoCliente" ADD CONSTRAINT "EventoCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
