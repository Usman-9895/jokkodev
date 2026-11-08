-- Additive audit decision. Text comparison avoids using a new enum literal
-- before commit when migrations are replayed as one query in integration tests.
ALTER TYPE "ModerationDecision" ADD VALUE 'REACTIVATE_ACCOUNT';
ALTER TABLE "ModerationAction" DROP CONSTRAINT "ModerationAction_decision_target_check";
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_decision_target_check"
  CHECK (("decision"::text IN ('SUSPEND_ACCOUNT', 'REACTIVATE_ACCOUNT')) = ("targetUserId" IS NOT NULL));
