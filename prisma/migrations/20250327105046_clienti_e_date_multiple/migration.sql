/*
  Warnings:

  - You are about to drop the column `clienteEmail` on the `Evento` table. All the data in the column will be lost.
  - You are about to drop the column `clienteNome` on the `Evento` table. All the data in the column will be lost.
  - You are about to drop the column `dataEvento` on the `Evento` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Evento" DROP COLUMN "clienteEmail",
DROP COLUMN "clienteNome",
DROP COLUMN "dataEvento",
ADD COLUMN     "clienteId" INTEGER,
ADD COLUMN     "dataConfermata" TIMESTAMP(3),
ADD COLUMN     "dateProposte" TEXT;

-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_email_key" ON "Cliente"("email");

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
