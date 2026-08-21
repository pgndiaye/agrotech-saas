-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionEventType" AS ENUM ('CREATED', 'RENEWED', 'UPGRADED', 'DOWNGRADED', 'EXPIRED', 'CANCELLED', 'REACTIVATED');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "autoRenew" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cancelledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PlanConfig" (
    "id" TEXT NOT NULL,
    "code" "Plan" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "priceXof" INTEGER NOT NULL DEFAULT 0,
    "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "quotas" JSONB NOT NULL DEFAULT '{}',
    "features" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "type" "SubscriptionEventType" NOT NULL,
    "fromPlan" "Plan",
    "toPlan" "Plan",
    "amountXof" INTEGER,
    "source" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanConfig_code_key" ON "PlanConfig"("code");

-- CreateIndex
CREATE INDEX "PlanConfig_isActive_sortOrder_idx" ON "PlanConfig"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "SubscriptionEvent_occurredAt_idx" ON "SubscriptionEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "SubscriptionEvent_tenantId_occurredAt_idx" ON "SubscriptionEvent"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "SubscriptionEvent_type_occurredAt_idx" ON "SubscriptionEvent"("type", "occurredAt");

-- AddForeignKey
ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
