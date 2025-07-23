-- CreateTable for SystemConfig
CREATE TABLE "SystemConfig" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable for Job
CREATE TABLE "Job" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "poolbrainJobId" INTEGER,
    "status" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "technicianId" INTEGER,
    "serviceType" TEXT NOT NULL,
    "notes" TEXT,
    "chemistryData" JSONB,
    "equipmentData" JSONB,
    "servicesData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- Add new fields to ReportHistory
ALTER TABLE "ReportHistory" ADD COLUMN IF NOT EXISTS "deliveryStatus" TEXT;
ALTER TABLE "ReportHistory" ADD COLUMN IF NOT EXISTS "openedAt" TIMESTAMP(3);

-- Add new field to ReportPreferences
ALTER TABLE "ReportPreferences" ADD COLUMN IF NOT EXISTS "preferredFormat" TEXT DEFAULT 'html';

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Job_poolbrainJobId_key" ON "Job"("poolbrainJobId");

-- CreateIndex
CREATE INDEX "Job_customerId_completedAt_idx" ON "Job"("customerId", "completedAt");

-- CreateIndex
CREATE INDEX "Job_poolbrainJobId_idx" ON "Job"("poolbrainJobId");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;