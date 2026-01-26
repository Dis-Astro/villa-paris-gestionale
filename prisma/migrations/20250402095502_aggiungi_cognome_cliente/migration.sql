/*
  Warnings:

  - You are about to drop the column `clienteId` on the `Evento` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Evento" DROP CONSTRAINT "Evento_clienteId_fkey";

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "cognome" TEXT,
ADD COLUMN     "indirizzo" TEXT,
ADD COLUMN     "telefono" TEXT;

-- AlterTable
ALTER TABLE "Evento" DROP COLUMN "clienteId";

-- CreateTable
CREATE TABLE "EventoCliente" (
    "id" SERIAL NOT NULL,
    "eventoId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,

    CONSTRAINT "EventoCliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventoCliente_eventoId_clienteId_key" ON "EventoCliente"("eventoId", "clienteId");

-- AddForeignKey
ALTER TABLE "EventoCliente" ADD CONSTRAINT "EventoCliente_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoCliente" ADD CONSTRAINT "EventoCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
