-- Additive: old API continues to read/write questions; files stay behind the API.
CREATE TABLE "QuestionImage" (
  "id" UUID NOT NULL,
  "ownerId" UUID NOT NULL,
  "questionId" UUID,
  "key" VARCHAR(40) NOT NULL,
  "position" INTEGER,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "QuestionImage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuestionImage_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "QuestionImage_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "QuestionImage_state_check" CHECK (("questionId" IS NULL AND "position" IS NULL) OR ("questionId" IS NOT NULL AND "position" IS NOT NULL AND "position" BETWEEN 0 AND 2)),
  CONSTRAINT "QuestionImage_key_check" CHECK ("key" ~ '^qi-[0-9a-f]{32}\.jpg$')
);
CREATE UNIQUE INDEX "QuestionImage_key_key" ON "QuestionImage"("key");
CREATE UNIQUE INDEX "QuestionImage_questionId_position_key" ON "QuestionImage"("questionId", "position");
CREATE INDEX "QuestionImage_ownerId_questionId_idx" ON "QuestionImage"("ownerId", "questionId");
CREATE INDEX "QuestionImage_expiresAt_idx" ON "QuestionImage"("expiresAt");
