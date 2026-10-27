ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMPTZ(3), ADD COLUMN "retentionObservedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Question" ADD COLUMN "retentionErasedAt" TIMESTAMPTZ(3);
ALTER TABLE "Project" ADD COLUMN "retentionErasedAt" TIMESTAMPTZ(3);
ALTER TABLE "Application" ADD COLUMN "messageErasedAt" TIMESTAMPTZ(3);
CREATE TABLE "InactivityNotice" (
 id UUID PRIMARY KEY, "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
 "basisAt" TIMESTAMPTZ(3) NOT NULL, "dueAt" TIMESTAMPTZ(3) NOT NULL,
 state VARCHAR(16) NOT NULL DEFAULT 'QUEUED' CHECK (state IN ('QUEUED','SENDING','SENT','UNCERTAIN','CANCELLED')),
 "sentAt" TIMESTAMPTZ(3), UNIQUE ("userId", "basisAt")
);
CREATE TABLE "RetentionHold" (
 category VARCHAR(32) NOT NULL, "entityId" UUID NOT NULL, reason VARCHAR(500) NOT NULL,
 owner VARCHAR(100) NOT NULL, "reviewAt" TIMESTAMPTZ(3) NOT NULL, "untilAt" TIMESTAMPTZ(3) NOT NULL,
 PRIMARY KEY (category,"entityId"), CHECK (length(btrim(reason)) > 0 AND length(btrim(owner)) > 0 AND "reviewAt" <= "untilAt")
);
CREATE TABLE "RetentionReview" (
 category VARCHAR(32) NOT NULL, "entityId" UUID NOT NULL, reason VARCHAR(40) NOT NULL,
 "reviewAt" TIMESTAMPTZ(3) NOT NULL, PRIMARY KEY (category,"entityId")
);
CREATE TABLE "RetentionEvent" (
 id UUID PRIMARY KEY, category VARCHAR(32) NOT NULL, "entityId" UUID NOT NULL,
 action VARCHAR(32) NOT NULL, at TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "RetentionEvent_at_idx" ON "RetentionEvent"(at);
CREATE INDEX "Session_retention_idx" ON "Session" ("expiresAt");
CREATE INDEX "AccountToken_retention_idx" ON "AccountToken" ("expiresAt");
CREATE INDEX "Application_retention_idx" ON "Application" ("decidedAt") WHERE "messageErasedAt" IS NULL;
CREATE INDEX "Question_retention_idx" ON "Question" ("deletedAt") WHERE "retentionErasedAt" IS NULL;
CREATE INDEX "Project_retention_idx" ON "Project" ("deletedAt") WHERE "retentionErasedAt" IS NULL;
CREATE INDEX "Report_retention_idx" ON "Report" ("closedAt");
CREATE INDEX "User_retention_idx" ON "User" ("createdAt");
