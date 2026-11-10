CREATE TABLE "GoogleIdentity" (
 "id" UUID NOT NULL, "sub" VARCHAR(255) NOT NULL, "userId" UUID NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "GoogleIdentity_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "GoogleIdentity_sub_check" CHECK (length("sub") > 0),
 CONSTRAINT "GoogleIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GoogleIdentity_sub_key" ON "GoogleIdentity"("sub");
CREATE UNIQUE INDEX "GoogleIdentity_userId_key" ON "GoogleIdentity"("userId");
CREATE TABLE "GoogleFlow" (
 "id" UUID NOT NULL, "browserHash" BYTEA NOT NULL, "stateHash" BYTEA,
 "stage" VARCHAR(16) NOT NULL, "payload" TEXT NOT NULL, "sessionId" UUID,
 "expiresAt" TIMESTAMPTZ(3) NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "GoogleFlow_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "GoogleFlow_stage_check" CHECK (("stage"='AUTHORIZATION' AND "stateHash" IS NOT NULL) OR ("stage"='PENDING' AND "stateHash" IS NULL)),
 CONSTRAINT "GoogleFlow_hash_check" CHECK (octet_length("browserHash")=32 AND ("stateHash" IS NULL OR octet_length("stateHash")=32))
);
CREATE UNIQUE INDEX "GoogleFlow_browserHash_key" ON "GoogleFlow"("browserHash");
CREATE UNIQUE INDEX "GoogleFlow_stateHash_key" ON "GoogleFlow"("stateHash");
CREATE INDEX "GoogleFlow_expiresAt_idx" ON "GoogleFlow"("expiresAt");
