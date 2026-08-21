-- CreateEnum
CREATE TYPE "TaskRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "TaskRun" (
    "id" TEXT NOT NULL,
    "taskName" TEXT NOT NULL,
    "runKey" TEXT NOT NULL,
    "status" "TaskRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "result" JSONB,
    "error" TEXT,

    CONSTRAINT "TaskRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskRun_taskName_startedAt_idx" ON "TaskRun"("taskName", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TaskRun_taskName_runKey_key" ON "TaskRun"("taskName", "runKey");

-- CreateIndex
CREATE INDEX "Listing_status_createdAt_idx" ON "Listing"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Listing_tenantId_idx" ON "Listing"("tenantId");

-- CreateIndex
CREATE INDEX "SmsLog_tenantId_createdAt_idx" ON "SmsLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Stock_tenantId_category_idx" ON "Stock"("tenantId", "category");

-- CreateIndex
CREATE INDEX "StockMovement_stockId_createdAt_idx" ON "StockMovement"("stockId", "createdAt");

-- CreateIndex
CREATE INDEX "Subscription_status_endDate_idx" ON "Subscription"("status", "endDate");

-- CreateIndex
CREATE INDEX "Transaction_tenantId_date_idx" ON "Transaction"("tenantId", "date");

-- CreateIndex
CREATE INDEX "Transaction_tenantId_type_idx" ON "Transaction"("tenantId", "type");
