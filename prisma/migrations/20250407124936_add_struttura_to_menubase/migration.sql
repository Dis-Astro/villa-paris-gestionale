/*
  Warnings:

  - Added the required column `struttura` to the `MenuBase` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MenuBase" ADD COLUMN     "struttura" JSONB NOT NULL;
