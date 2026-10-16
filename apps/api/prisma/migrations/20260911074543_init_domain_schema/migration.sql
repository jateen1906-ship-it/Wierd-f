-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "displayName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "bio" TEXT,
    "avatarUrl" TEXT,
    "skillLevel" VARCHAR(50) NOT NULL DEFAULT 'beginner',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "dietaryRestrictions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "spiceTolerance" VARCHAR(30) NOT NULL DEFAULT 'medium',
    "preferredCuisines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dislikedIngredients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "availableEquipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "budgetPreference" VARCHAR(30) NOT NULL DEFAULT 'moderate',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" VARCHAR(50) NOT NULL DEFAULT 'other',
    "commonSubstitutions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isCommonAllergen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiments" (
    "id" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "parentId" UUID,
    "rootId" UUID,
    "branchDepth" INTEGER NOT NULL DEFAULT 0,
    "transformations" JSONB,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "difficulty" VARCHAR(30) NOT NULL DEFAULT 'medium',
    "estimatedCost" JSONB,
    "estimatedTimeMinutes" INTEGER NOT NULL DEFAULT 15,
    "heroMedia" JSONB,
    "aiMetadata" JSONB,
    "safetyStatus" VARCHAR(30) NOT NULL DEFAULT 'SAFE',
    "remixCount" INTEGER NOT NULL DEFAULT 0,
    "cookCount" INTEGER NOT NULL DEFAULT 0,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "experiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiment_ingredients" (
    "id" UUID NOT NULL,
    "experimentId" UUID NOT NULL,
    "canonicalId" UUID,
    "name" VARCHAR(150) NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "preparation" VARCHAR(150),
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "isCustomAddition" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "experiment_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cooking_results" (
    "id" UUID NOT NULL,
    "experimentId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "media" JSONB NOT NULL,
    "caption" TEXT,
    "notes" TEXT,
    "outcomeTag" VARCHAR(50) NOT NULL DEFAULT 'unexpectedly_worked',
    "tasteRating" INTEGER NOT NULL DEFAULT 3,
    "textureRating" INTEGER,
    "wouldMakeAgain" BOOLEAN NOT NULL DEFAULT true,
    "modificationsMade" TEXT,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cooking_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "experimentId" UUID NOT NULL,
    "choice" VARCHAR(30) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_decisions" (
    "id" UUID NOT NULL,
    "targetId" UUID NOT NULL,
    "targetType" VARCHAR(50) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'SAFE',
    "riskCategory" VARCHAR(50) NOT NULL DEFAULT 'none',
    "reason" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluatorType" VARCHAR(50) NOT NULL,
    "modelVersion" VARCHAR(50),
    "reviewerNotes" TEXT,
    "experimentId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "safety_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_name_key" ON "ingredients"("name");

-- CreateIndex
CREATE INDEX "ingredients_name_idx" ON "ingredients"("name");

-- CreateIndex
CREATE INDEX "ingredients_category_idx" ON "ingredients"("category");

-- CreateIndex
CREATE INDEX "experiments_creatorId_idx" ON "experiments"("creatorId");

-- CreateIndex
CREATE INDEX "experiments_parentId_idx" ON "experiments"("parentId");

-- CreateIndex
CREATE INDEX "experiments_rootId_idx" ON "experiments"("rootId");

-- CreateIndex
CREATE INDEX "experiments_branchDepth_idx" ON "experiments"("branchDepth");

-- CreateIndex
CREATE INDEX "experiments_safetyStatus_idx" ON "experiments"("safetyStatus");

-- CreateIndex
CREATE INDEX "experiments_createdAt_idx" ON "experiments"("createdAt");

-- CreateIndex
CREATE INDEX "experiment_ingredients_experimentId_idx" ON "experiment_ingredients"("experimentId");

-- CreateIndex
CREATE INDEX "experiment_ingredients_canonicalId_idx" ON "experiment_ingredients"("canonicalId");

-- CreateIndex
CREATE INDEX "cooking_results_experimentId_idx" ON "cooking_results"("experimentId");

-- CreateIndex
CREATE INDEX "cooking_results_userId_idx" ON "cooking_results"("userId");

-- CreateIndex
CREATE INDEX "cooking_results_outcomeTag_idx" ON "cooking_results"("outcomeTag");

-- CreateIndex
CREATE INDEX "votes_experimentId_idx" ON "votes"("experimentId");

-- CreateIndex
CREATE INDEX "votes_userId_idx" ON "votes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "votes_userId_experimentId_key" ON "votes"("userId", "experimentId");

-- CreateIndex
CREATE INDEX "safety_decisions_targetId_targetType_idx" ON "safety_decisions"("targetId", "targetType");

-- CreateIndex
CREATE INDEX "safety_decisions_status_idx" ON "safety_decisions"("status");

-- CreateIndex
CREATE INDEX "safety_decisions_experimentId_idx" ON "safety_decisions"("experimentId");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "experiments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_rootId_fkey" FOREIGN KEY ("rootId") REFERENCES "experiments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_ingredients" ADD CONSTRAINT "experiment_ingredients_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_ingredients" ADD CONSTRAINT "experiment_ingredients_canonicalId_fkey" FOREIGN KEY ("canonicalId") REFERENCES "ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_results" ADD CONSTRAINT "cooking_results_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_results" ADD CONSTRAINT "cooking_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_decisions" ADD CONSTRAINT "safety_decisions_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
