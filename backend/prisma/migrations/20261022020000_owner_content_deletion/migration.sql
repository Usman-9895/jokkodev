-- Additive owner deletion: no existing data or relation is removed.
ALTER TABLE "Question" ADD COLUMN "deletedAt" TIMESTAMPTZ(3);
ALTER TABLE "Project" ADD COLUMN "deletedAt" TIMESTAMPTZ(3);
