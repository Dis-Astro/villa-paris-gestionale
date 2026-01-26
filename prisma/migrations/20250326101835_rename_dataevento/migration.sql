/*
  Warnings:

  - You are about to drop the column `dataFine` on the `Evento` table. All the data in the column will be lost.
  - You are about to drop the column `dataInizio` on the `Evento` table. All the data in the column will be lost.
  - Added the required column `dataEvento` to the `Evento` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Evento" DROP COLUMN "dataFine",
DROP COLUMN "dataInizio",
ADD COLUMN     "dataEvento" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "fascia" SET DEFAULT 'pranzo';
