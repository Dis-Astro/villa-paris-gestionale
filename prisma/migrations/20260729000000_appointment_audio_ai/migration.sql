ALTER TABLE "Appuntamento"
ADD COLUMN "tipoEventoRichiesto" TEXT,
ADD COLUMN "personePreviste" INTEGER,
ADD COLUMN "dataEventoRichiesta" TIMESTAMP(3),
ADD COLUMN "registrazioneAudioPath" TEXT,
ADD COLUMN "registrazioneAudioNome" TEXT,
ADD COLUMN "registrazioneAudioMime" TEXT,
ADD COLUMN "trascrizioneAI" TEXT,
ADD COLUMN "analisiAudioAI" JSONB,
ADD COLUMN "analisiAudioStato" TEXT,
ADD COLUMN "analisiAudioAt" TIMESTAMP(3);

CREATE INDEX "Appuntamento_analisiAudioStato_idx" ON "Appuntamento"("analisiAudioStato");
