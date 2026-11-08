CREATE TABLE "EmailNotification" (
 "id" UUID NOT NULL,
 "decisionKey" VARCHAR(100) NOT NULL,
 "kind" VARCHAR(30) NOT NULL,
 "userId" UUID,
 "projectId" UUID,
 "projectTitle" VARCHAR(150),
 "status" VARCHAR(12) NOT NULL DEFAULT 'PENDING',
 "attempts" INTEGER NOT NULL DEFAULT 0,
 "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "claimedAt" TIMESTAMPTZ(3),
 "claimToken" UUID,
 "lastCode" VARCHAR(32),
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "finishedAt" TIMESTAMPTZ(3),
 CONSTRAINT "EmailNotification_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "EmailNotification_kind_check" CHECK (kind IN ('APPLICATION_ACCEPTED','ACCOUNT_REACTIVATED')),
 CONSTRAINT "EmailNotification_status_check" CHECK (status IN ('PENDING','SENDING','SENT','SKIPPED','FAILED','UNCERTAIN')),
 CONSTRAINT "EmailNotification_attempts_check" CHECK (attempts BETWEEN 0 AND 5),
 CONSTRAINT "EmailNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EmailNotification_decisionKey_key" ON "EmailNotification"("decisionKey");
CREATE INDEX "EmailNotification_status_nextAttemptAt_idx" ON "EmailNotification"("status","nextAttemptAt");
CREATE INDEX "EmailNotification_createdAt_idx" ON "EmailNotification"("createdAt");
