-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AccountTokenPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('VISIBLE', 'HIDDEN');

-- CreateEnum
CREATE TYPE "RecruitmentStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ModerationDecision" AS ENUM ('NO_ACTION', 'HIDE_CONTENT', 'SUSPEND_ACCOUNT');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "username" VARCHAR(30) NOT NULL,
    "usernameKey" VARCHAR(30) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailVerifiedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "userId" UUID NOT NULL,
    "bio" VARCHAR(500),
    "countryCode" CHAR(2),
    "links" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "tokenHash" BYTEA NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountToken" (
    "id" UUID NOT NULL,
    "tokenHash" BYTEA NOT NULL,
    "userId" UUID NOT NULL,
    "purpose" "AccountTokenPurpose" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),

    CONSTRAINT "AccountToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Technology" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Technology_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileTechnology" (
    "userId" UUID NOT NULL,
    "technologyId" UUID NOT NULL,

    CONSTRAINT "ProfileTechnology_pkey" PRIMARY KEY ("userId","technologyId")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "context" TEXT NOT NULL,
    "expected" TEXT NOT NULL,
    "actual" TEXT NOT NULL,
    "attempts" TEXT NOT NULL,
    "code" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'VISIBLE',
    "acceptedAnswerId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionTechnology" (
    "questionId" UUID NOT NULL,
    "technologyId" UUID NOT NULL,

    CONSTRAINT "QuestionTechnology_pkey" PRIMARY KEY ("questionId","technologyId")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "code" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'VISIBLE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "objective" VARCHAR(5000) NOT NULL,
    "availability" VARCHAR(300),
    "recruitmentStatus" "RecruitmentStatus" NOT NULL DEFAULT 'OPEN',
    "visibility" "Visibility" NOT NULL DEFAULT 'VISIBLE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTechnology" (
    "projectId" UUID NOT NULL,
    "technologyId" UUID NOT NULL,

    CONSTRAINT "ProjectTechnology_pkey" PRIMARY KEY ("projectId","technologyId")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "projectId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "joinedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("projectId","userId")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "applicantId" UUID NOT NULL,
    "message" VARCHAR(1000) NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "decidedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "questionId" UUID,
    "answerId" UUID,
    "projectId" UUID,
    "reason" VARCHAR(1000) NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "decision" "ModerationDecision",
    "closedById" UUID,
    "closedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationAction" (
    "id" UUID NOT NULL,
    "adminId" UUID NOT NULL,
    "decision" "ModerationDecision" NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "reportId" UUID,
    "questionId" UUID,
    "answerId" UUID,
    "projectId" UUID,
    "targetUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_usernameKey_key" ON "User"("usernameKey");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountToken_tokenHash_key" ON "AccountToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AccountToken_userId_purpose_idx" ON "AccountToken"("userId", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "Technology_name_key" ON "Technology"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Technology_slug_key" ON "Technology"("slug");

-- CreateIndex
CREATE INDEX "ProfileTechnology_technologyId_idx" ON "ProfileTechnology"("technologyId");

-- CreateIndex
CREATE INDEX "Question_visibility_createdAt_id_idx" ON "Question"("visibility", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "Question_authorId_createdAt_idx" ON "Question"("authorId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Question_acceptedAnswerId_id_key" ON "Question"("acceptedAnswerId", "id");

-- CreateIndex
CREATE INDEX "QuestionTechnology_technologyId_idx" ON "QuestionTechnology"("technologyId");

-- CreateIndex
CREATE INDEX "Answer_questionId_createdAt_id_idx" ON "Answer"("questionId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Answer_authorId_createdAt_idx" ON "Answer"("authorId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Answer_id_questionId_key" ON "Answer"("id", "questionId");

-- CreateIndex
CREATE INDEX "Project_visibility_recruitmentStatus_createdAt_id_idx" ON "Project"("visibility", "recruitmentStatus", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "Project_ownerId_createdAt_idx" ON "Project"("ownerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ProjectTechnology_technologyId_idx" ON "ProjectTechnology"("technologyId");

-- CreateIndex
CREATE INDEX "ProjectMember_userId_joinedAt_idx" ON "ProjectMember"("userId", "joinedAt" DESC);

-- CreateIndex
CREATE INDEX "Application_projectId_status_createdAt_idx" ON "Application"("projectId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Application_applicantId_createdAt_idx" ON "Application"("applicantId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Application_projectId_applicantId_key" ON "Application"("projectId", "applicantId");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_id_idx" ON "Report"("status", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");

-- CreateIndex
CREATE INDEX "Report_questionId_idx" ON "Report"("questionId");

-- CreateIndex
CREATE INDEX "Report_answerId_idx" ON "Report"("answerId");

-- CreateIndex
CREATE INDEX "Report_projectId_idx" ON "Report"("projectId");

-- CreateIndex
CREATE INDEX "ModerationAction_createdAt_id_idx" ON "ModerationAction"("createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "ModerationAction_reportId_idx" ON "ModerationAction"("reportId");

-- CreateIndex
CREATE INDEX "ModerationAction_questionId_idx" ON "ModerationAction"("questionId");

-- CreateIndex
CREATE INDEX "ModerationAction_answerId_idx" ON "ModerationAction"("answerId");

-- CreateIndex
CREATE INDEX "ModerationAction_projectId_idx" ON "ModerationAction"("projectId");

-- CreateIndex
CREATE INDEX "ModerationAction_targetUserId_idx" ON "ModerationAction"("targetUserId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountToken" ADD CONSTRAINT "AccountToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileTechnology" ADD CONSTRAINT "ProfileTechnology_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileTechnology" ADD CONSTRAINT "ProfileTechnology_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_acceptedAnswerId_id_fkey" FOREIGN KEY ("acceptedAnswerId", "id") REFERENCES "Answer"("id", "questionId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "QuestionTechnology" ADD CONSTRAINT "QuestionTechnology_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionTechnology" ADD CONSTRAINT "QuestionTechnology_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTechnology" ADD CONSTRAINT "ProjectTechnology_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTechnology" ADD CONSTRAINT "ProjectTechnology_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contraintes métier non exprimables dans le schéma Prisma.

-- Formes normalisées calculées par l'API ; la base refuse toute autre forme.
ALTER TABLE "User" ADD CONSTRAINT "User_email_normalized_check" CHECK ("email" = lower(btrim("email")) AND "email" <> '');
ALTER TABLE "User" ADD CONSTRAINT "User_usernameKey_check" CHECK ("usernameKey" = lower("username") AND char_length("username") >= 3);

ALTER TABLE "Profile" ADD CONSTRAINT "Profile_countryCode_check" CHECK ("countryCode" IS NULL OR "countryCode" ~ '^[A-Z]{2}$');
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_links_check" CHECK (cardinality("links") <= 3);

ALTER TABLE "Session" ADD CONSTRAINT "Session_expiry_check" CHECK ("expiresAt" > "createdAt");
ALTER TABLE "AccountToken" ADD CONSTRAINT "AccountToken_expiry_check" CHECK ("expiresAt" > "createdAt");

-- Une décision est datée, une demande en attente ne l'est pas.
ALTER TABLE "Application" ADD CONSTRAINT "Application_decision_check" CHECK (("status" = 'PENDING') = ("decidedAt" IS NULL));

-- Un signalement vise exactement une question, une réponse ou un projet.
ALTER TABLE "Report" ADD CONSTRAINT "Report_single_target_check" CHECK (num_nonnulls("questionId", "answerId", "projectId") = 1);
-- Un signalement clôturé porte sa décision, son auteur et sa date ; un signalement ouvert n'en porte aucun.
ALTER TABLE "Report" ADD CONSTRAINT "Report_closure_check" CHECK (
  ("status" = 'OPEN' AND "decision" IS NULL AND "closedById" IS NULL AND "closedAt" IS NULL)
  OR ("status" = 'CLOSED' AND "decision" IS NOT NULL AND "closedById" IS NOT NULL AND "closedAt" IS NOT NULL)
);

-- Un seul signalement ouvert par déclarant et par cible.
CREATE UNIQUE INDEX "Report_open_question_key" ON "Report"("reporterId", "questionId") WHERE "status" = 'OPEN' AND "questionId" IS NOT NULL;
CREATE UNIQUE INDEX "Report_open_answer_key" ON "Report"("reporterId", "answerId") WHERE "status" = 'OPEN' AND "answerId" IS NOT NULL;
CREATE UNIQUE INDEX "Report_open_project_key" ON "Report"("reporterId", "projectId") WHERE "status" = 'OPEN' AND "projectId" IS NOT NULL;

-- Une action de modération vise exactement un contenu ou un compte, cohérent avec la décision.
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_single_target_check" CHECK (num_nonnulls("questionId", "answerId", "projectId", "targetUserId") = 1);
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_decision_target_check" CHECK (("decision" = 'SUSPEND_ACCOUNT') = ("targetUserId" IS NOT NULL));
