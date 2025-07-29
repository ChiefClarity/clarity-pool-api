-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Technician" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'technician';

-- CreateTable
CREATE TABLE "ReportPreferences" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "reportDelay" INTEGER NOT NULL DEFAULT 5,
    "includeCharts" BOOLEAN NOT NULL DEFAULT true,
    "preferredFormat" TEXT NOT NULL DEFAULT 'html',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportHistory" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "jobId" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "healthScore" INTEGER NOT NULL,
    "reportType" TEXT NOT NULL,
    "opened" BOOLEAN NOT NULL DEFAULT false,
    "deliveryStatus" TEXT,
    "openedAt" TIMESTAMP(3),

    CONSTRAINT "ReportHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "ReportPreferences_customerId_key" ON "ReportPreferences"("customerId");

-- CreateIndex
CREATE INDEX "ReportHistory_customerId_sentAt_idx" ON "ReportHistory"("customerId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Job_poolbrainJobId_key" ON "Job"("poolbrainJobId");

-- CreateIndex
CREATE INDEX "Job_customerId_completedAt_idx" ON "Job"("customerId", "completedAt");

-- CreateIndex
CREATE INDEX "Job_poolbrainJobId_idx" ON "Job"("poolbrainJobId");

-- AddForeignKey
ALTER TABLE "ReportPreferences" ADD CONSTRAINT "ReportPreferences_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportHistory" ADD CONSTRAINT "ReportHistory_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;
