CREATE TABLE "GitHubIdentity" (
 "id" UUID NOT NULL, "sub" VARCHAR(255) NOT NULL, "userId" UUID NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "GitHubIdentity_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "GitHubIdentity_sub_check" CHECK (length("sub") > 0),
 CONSTRAINT "GitHubIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GitHubIdentity_sub_key" ON "GitHubIdentity"("sub");
CREATE UNIQUE INDEX "GitHubIdentity_userId_key" ON "GitHubIdentity"("userId");
CREATE TABLE "GitHubFlow" (
 "id" UUID NOT NULL, "browserHash" BYTEA NOT NULL, "stateHash" BYTEA,
 "stage" VARCHAR(16) NOT NULL, "payload" TEXT NOT NULL, "sessionId" UUID,
 "expiresAt" TIMESTAMPTZ(3) NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "GitHubFlow_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "GitHubFlow_stage_check" CHECK (("stage"='AUTHORIZATION' AND "stateHash" IS NOT NULL) OR ("stage"='PENDING' AND "stateHash" IS NULL)),
 CONSTRAINT "GitHubFlow_hash_check" CHECK (octet_length("browserHash")=32 AND ("stateHash" IS NULL OR octet_length("stateHash")=32))
);
CREATE UNIQUE INDEX "GitHubFlow_browserHash_key" ON "GitHubFlow"("browserHash");
CREATE UNIQUE INDEX "GitHubFlow_stateHash_key" ON "GitHubFlow"("stateHash");
CREATE INDEX "GitHubFlow_expiresAt_idx" ON "GitHubFlow"("expiresAt");
