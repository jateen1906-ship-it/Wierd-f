-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "experimentId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_experimentId_idx" ON "notifications"("experimentId");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_userId_experimentId_type_key" ON "notifications"("userId", "experimentId", "type");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
