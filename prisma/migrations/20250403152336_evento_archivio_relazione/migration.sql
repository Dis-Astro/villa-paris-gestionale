-- CreateTable
CREATE TABLE "ArchivioPiatto" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "eventoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchivioPiatto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ArchivioPiatto" ADD CONSTRAINT "ArchivioPiatto_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
