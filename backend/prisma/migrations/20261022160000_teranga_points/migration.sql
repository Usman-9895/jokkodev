-- CreateEnum
CREATE TYPE "ReputationReason" AS ENUM ('ANSWER_ACCEPTED', 'ACCEPTANCE_WITHDRAWN', 'ANSWER_HIDDEN', 'QUESTION_HIDDEN', 'QUESTION_DELETED', 'RECONCILIATION');

-- CreateTable
CREATE TABLE "ReputationEvent" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "answerId" UUID NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "ReputationReason" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReputationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReputationEvent_userId_idx" ON "ReputationEvent"("userId");

-- CreateIndex
CREATE INDEX "ReputationEvent_questionId_idx" ON "ReputationEvent"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ReputationEvent_answerId_sequence_key" ON "ReputationEvent"("answerId", "sequence");

-- AddForeignKey
ALTER TABLE "ReputationEvent" ADD CONSTRAINT "ReputationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReputationEvent" ADD CONSTRAINT "ReputationEvent_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReputationEvent" ADD CONSTRAINT "ReputationEvent_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Un mouvement est non nul, son sens correspond à son motif, et les rangs commencent à 1.
ALTER TABLE "ReputationEvent" ADD CONSTRAINT "ReputationEvent_delta_check" CHECK (
  ("reason" = 'ANSWER_ACCEPTED' AND "delta" > 0) OR ("reason" IN ('ACCEPTANCE_WITHDRAWN', 'ANSWER_HIDDEN', 'QUESTION_HIDDEN', 'QUESTION_DELETED') AND "delta" < 0) OR ("reason" = 'RECONCILIATION' AND "delta" <> 0)
);
ALTER TABLE "ReputationEvent" ADD CONSTRAINT "ReputationEvent_sequence_check" CHECK ("sequence" >= 1);

-- Runtime cannot rewrite ledger history. DBA maintenance remains privileged.
CREATE FUNCTION reputation_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Reputation history is append-only' USING ERRCODE = '23514'; END $$;
CREATE TRIGGER reputation_append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON "ReputationEvent" FOR EACH STATEMENT EXECUTE FUNCTION reputation_append_only();
