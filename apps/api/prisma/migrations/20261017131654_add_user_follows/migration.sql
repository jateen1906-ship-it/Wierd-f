-- CreateTable
CREATE TABLE "user_follows" (
    "id" UUID NOT NULL,
    "followerId" UUID NOT NULL,
    "followingId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_follows_followerId_idx" ON "user_follows"("followerId");

-- CreateIndex
CREATE INDEX "user_follows_followingId_idx" ON "user_follows"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "user_follows_followerId_followingId_key" ON "user_follows"("followerId", "followingId");

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "unique_user_result_reaction" RENAME TO "result_reactions_userId_resultId_key";
