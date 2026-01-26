/*
  Warnings:

  - You are about to drop the column `indirizzo` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `archiviato` on the `Evento` table. All the data in the column will be lost.
  - You are about to drop the `ArchivioPiatto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EventoCliente` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `Cliente` table without a default value. This is not possible if the table is not empty.
  - Made the column `cognome` on table `Cliente` required. This step will fail if there are existing NULL values in that column.
  - Made the column `dateProposte` on table `Evento` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `MenuBase` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ArchivioPiatto" DROP CONSTRAINT "ArchivioPiatto_eventoId_fkey";

-- DropForeignKey
ALTER TABLE "EventoCliente" DROP CONSTRAINT "EventoCliente_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "EventoCliente" DROP CONSTRAINT "EventoCliente_eventoId_fkey";

-- DropIndex
DROP INDEX "Cliente_email_key";

-- AlterTable
ALTER TABLE "Cliente" DROP COLUMN "indirizzo",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "cognome" SET NOT NULL;

-- AlterTable
ALTER TABLE "Evento" DROP COLUMN "archiviato",
ADD COLUMN     "disposizioneSala" JSONB,
ADD COLUMN     "struttura" JSONB,
ALTER COLUMN "stato" DROP DEFAULT,
ALTER COLUMN "fascia" DROP DEFAULT,
ALTER COLUMN "dateProposte" SET NOT NULL;

-- AlterTable
ALTER TABLE "MenuBase" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "ArchivioPiatto";

-- DropTable
DROP TABLE "EventoCliente";
