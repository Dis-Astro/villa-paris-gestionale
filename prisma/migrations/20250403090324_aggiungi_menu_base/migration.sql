-- CreateTable
CREATE TABLE "MenuBase" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuBase_pkey" PRIMARY KEY ("id")
);
