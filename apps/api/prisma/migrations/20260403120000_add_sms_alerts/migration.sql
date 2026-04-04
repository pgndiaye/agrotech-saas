-- CreateEnum
CREATE TYPE "SmsAlertType" AS ENUM ('STOCK_CRITICAL', 'STOCK_LOW', 'WEATHER_ALERT', 'FINANCE_ALERT', 'WEEKLY_DIGEST', 'TEST');

-- CreateEnum
CREATE TYPE "SmsStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SIMULATED');

-- CreateTable
CREATE TABLE "SmsAlertConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "phoneNumber" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Dakar',
    "stockAlerts" BOOLEAN NOT NULL DEFAULT true,
    "weatherAlerts" BOOLEAN NOT NULL DEFAULT true,
    "financeAlerts" BOOLEAN NOT NULL DEFAULT true,
    "weeklyDigest" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsAlertConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "SmsAlertType" NOT NULL,
    "status" "SmsStatus" NOT NULL,
    "provider" TEXT,
    "externalId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SmsAlertConfig_tenantId_key" ON "SmsAlertConfig"("tenantId");

-- CreateIndex
CREATE INDEX "SmsLog_tenantId_idx" ON "SmsLog"("tenantId");

-- AddForeignKey
ALTER TABLE "SmsAlertConfig" ADD CONSTRAINT "SmsAlertConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsLog" ADD CONSTRAINT "SmsLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
