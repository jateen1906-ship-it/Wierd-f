-- CreateTable
CREATE TABLE "result_reactions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "resultId" UUID NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "result_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "result_reactions_resultId_idx" ON "result_reactions"("resultId");

-- CreateIndex
CREATE INDEX "result_reactions_userId_idx" ON "result_reactions"("userId");

-- CreateIndex
CREATE INDEX "result_reactions_type_idx" ON "result_reactions"("type");

-- CreateIndex
CREATE UNIQUE INDEX "unique_user_result_reaction" ON "result_reactions"("userId", "resultId");

-- AddForeignKey
ALTER TABLE "result_reactions" ADD CONSTRAINT "result_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_reactions" ADD CONSTRAINT "result_reactions_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "cooking_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
