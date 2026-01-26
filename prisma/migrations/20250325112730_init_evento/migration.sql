-- CreateTable
CREATE TABLE "Evento" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "titolo" TEXT NOT NULL,
    "dataInizio" TIMESTAMP(3) NOT NULL,
    "dataFine" TIMESTAMP(3) NOT NULL,
    "clienteNome" TEXT NOT NULL,
    "clienteEmail" TEXT NOT NULL,
    "stato" TEXT NOT NULL DEFAULT 'in_attesa',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);
