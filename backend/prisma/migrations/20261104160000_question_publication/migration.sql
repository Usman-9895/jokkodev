CREATE TABLE "QuestionPublication" (
  "userId" UUID NOT NULL,
  "action" VARCHAR(32) NOT NULL,
  "key" VARCHAR(64) NOT NULL,
  "payloadHash" CHAR(64) NOT NULL,
  "questionId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retainUntil" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "QuestionPublication_pkey" PRIMARY KEY ("userId", "action", "key"),
  CONSTRAINT "QuestionPublication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "QuestionPublication_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "QuestionPublication_questionId_key" ON "QuestionPublication"("questionId");
CREATE INDEX "QuestionPublication_retainUntil_idx" ON "QuestionPublication"("retainUntil");
