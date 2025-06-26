-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "poolbrainId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "bookingDate" TIMESTAMP(3) NOT NULL,
    "preferredDate" TIMESTAMP(3),
    "bookingSource" TEXT NOT NULL DEFAULT 'website',
    "appDownloaded" BOOLEAN NOT NULL DEFAULT false,
    "appDownloadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingSession" (
    "id" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "stepsCompleted" JSONB NOT NULL DEFAULT '[]',
    "syncedToPoolbrain" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "voiceNoteUrl" TEXT,
    "voiceNoteDuration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterChemistry" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "chlorine" DOUBLE PRECISION NOT NULL,
    "ph" DOUBLE PRECISION NOT NULL,
    "alkalinity" INTEGER NOT NULL,
    "cyanuricAcid" INTEGER NOT NULL,
    "calcium" INTEGER,
    "salt" INTEGER,
    "hasSaltSystem" BOOLEAN NOT NULL DEFAULT false,
    "tds" INTEGER,
    "temperature" INTEGER,
    "phosphates" DOUBLE PRECISION,
    "copper" DOUBLE PRECISION,
    "iron" DOUBLE PRECISION,
    "orp" INTEGER,
    "notes" TEXT,
    "poolbrainSynced" BOOLEAN NOT NULL DEFAULT false,
    "poolbrainJobId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaterChemistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "pumpType" TEXT NOT NULL,
    "pumpManufacturer" TEXT NOT NULL,
    "pumpModel" TEXT NOT NULL,
    "pumpSerial" TEXT,
    "pumpCondition" TEXT,
    "pumpPhotoUrls" JSONB,
    "filterType" TEXT NOT NULL,
    "filterManufacturer" TEXT NOT NULL,
    "filterModel" TEXT,
    "filterCondition" TEXT,
    "filterPhotoUrls" JSONB,
    "sanitizerType" TEXT NOT NULL,
    "sanitizerManufacturer" TEXT,
    "sanitizerModel" TEXT,
    "sanitizerCondition" TEXT,
    "heaterData" JSONB,
    "timerData" JSONB,
    "valveData" JSONB,
    "additionalEquipment" JSONB,
    "notes" TEXT,
    "poolbrainSynced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoolDetails" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "shape" TEXT NOT NULL,
    "length" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "avgDepth" DOUBLE PRECISION NOT NULL,
    "deepEndDepth" DOUBLE PRECISION NOT NULL,
    "shallowEndDepth" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "surfaceMaterial" TEXT NOT NULL,
    "surfaceCondition" TEXT NOT NULL,
    "surfaceStains" BOOLEAN NOT NULL DEFAULT false,
    "stainDescription" TEXT,
    "features" JSONB NOT NULL,
    "deckAndFence" JSONB NOT NULL,
    "environment" JSONB NOT NULL,
    "photoUrls" JSONB NOT NULL,
    "notes" TEXT,
    "poolbrainSynced" BOOLEAN NOT NULL DEFAULT false,
    "poolbrainWaterBodyId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoolDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAnalysis" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "overview" TEXT NOT NULL,
    "waterStatus" TEXT NOT NULL,
    "waterIssues" JSONB NOT NULL,
    "waterRecs" JSONB NOT NULL,
    "equipmentStatus" TEXT NOT NULL,
    "equipment" JSONB NOT NULL,
    "maintenanceNeeds" JSONB NOT NULL,
    "poolDimensions" JSONB,
    "propertyFeatures" JSONB,
    "satelliteImageUrl" TEXT,
    "immediateWork" JSONB NOT NULL,
    "recommendedWork" JSONB NOT NULL,
    "totalImmediate" DOUBLE PRECISION NOT NULL,
    "totalRecommended" DOUBLE PRECISION NOT NULL,
    "voiceTranscription" TEXT,
    "voiceSummary" TEXT,
    "voiceInsights" JSONB,
    "safetyIssues" JSONB NOT NULL,
    "maintenancePlan" JSONB NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedByCsm" BOOLEAN NOT NULL DEFAULT false,
    "csmNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Technician" (
    "id" SERIAL NOT NULL,
    "poolbrainId" INTEGER,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Technician_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_poolbrainId_key" ON "Customer"("poolbrainId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PoolDetails_customerId_key" ON "PoolDetails"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "AIAnalysis_sessionId_key" ON "AIAnalysis"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Technician_poolbrainId_key" ON "Technician"("poolbrainId");

-- CreateIndex
CREATE UNIQUE INDEX "Technician_email_key" ON "Technician"("email");

-- AddForeignKey
ALTER TABLE "OnboardingSession" ADD CONSTRAINT "OnboardingSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingSession" ADD CONSTRAINT "OnboardingSession_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterChemistry" ADD CONSTRAINT "WaterChemistry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolDetails" ADD CONSTRAINT "PoolDetails_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OnboardingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
