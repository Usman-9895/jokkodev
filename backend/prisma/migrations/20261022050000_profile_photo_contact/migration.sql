-- Additive photo and opt-in private collaboration contact.
ALTER TABLE "User" ADD COLUMN "avatarKey" VARCHAR(40);
CREATE UNIQUE INDEX "User_avatarKey_key" ON "User"("avatarKey");
ALTER TABLE "Profile" ADD COLUMN "collaborationContact" VARCHAR(2048), ADD COLUMN "collaborationContactEnabled" BOOLEAN NOT NULL DEFAULT false;
