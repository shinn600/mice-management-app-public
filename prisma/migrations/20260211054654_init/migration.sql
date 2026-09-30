-- CreateTable
CREATE TABLE "Strain" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "geneticBackground" TEXT NOT NULL,
    "modificationType" TEXT,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#4F46E5',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Mouse" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mouseCode" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "birthDate" DATETIME,
    "strainId" INTEGER NOT NULL,
    "fatherId" INTEGER,
    "motherId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'alive',
    "identificationMethod" TEXT,
    "identificationNote" TEXT,
    "cageId" INTEGER,
    "note" TEXT,
    "litterId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Mouse_strainId_fkey" FOREIGN KEY ("strainId") REFERENCES "Strain" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Mouse_fatherId_fkey" FOREIGN KEY ("fatherId") REFERENCES "Mouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Mouse_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Mouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Mouse_cageId_fkey" FOREIGN KEY ("cageId") REFERENCES "Cage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Mouse_litterId_fkey" FOREIGN KEY ("litterId") REFERENCES "Litter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GenotypingRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mouseId" INTEGER NOT NULL,
    "targetGene" TEXT NOT NULL,
    "pcrResult" TEXT NOT NULL,
    "genotypeLabel" TEXT NOT NULL,
    "testedDate" DATETIME,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GenotypingRecord_mouseId_fkey" FOREIGN KEY ("mouseId") REFERENCES "Mouse" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MatingPair" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "maleId" INTEGER NOT NULL,
    "femaleId" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "cageId" INTEGER,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MatingPair_maleId_fkey" FOREIGN KEY ("maleId") REFERENCES "Mouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MatingPair_femaleId_fkey" FOREIGN KEY ("femaleId") REFERENCES "Mouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MatingPair_cageId_fkey" FOREIGN KEY ("cageId") REFERENCES "Cage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlugCheck" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matingPairId" INTEGER NOT NULL,
    "checkDate" DATETIME NOT NULL,
    "plugFound" BOOLEAN NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlugCheck_matingPairId_fkey" FOREIGN KEY ("matingPairId") REFERENCES "MatingPair" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Litter" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matingPairId" INTEGER NOT NULL,
    "birthDate" DATETIME NOT NULL,
    "pupCount" INTEGER NOT NULL,
    "weaningDate" DATETIME,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Litter_matingPairId_fkey" FOREIGN KEY ("matingPairId") REFERENCES "MatingPair" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cageCode" TEXT NOT NULL,
    "maxCapacity" INTEGER NOT NULL DEFAULT 5,
    "rackId" INTEGER,
    "shelfNumber" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cage_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "Rack" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rack" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExperimentApproval" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "approvalNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "allowedCount" INTEGER NOT NULL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ComplianceUsage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "experimentApprovalId" INTEGER NOT NULL,
    "mouseId" INTEGER NOT NULL,
    "usageDate" DATETIME NOT NULL,
    "purpose" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComplianceUsage_experimentApprovalId_fkey" FOREIGN KEY ("experimentApprovalId") REFERENCES "ExperimentApproval" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ComplianceUsage_mouseId_fkey" FOREIGN KEY ("mouseId") REFERENCES "Mouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Strain_name_key" ON "Strain"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Mouse_mouseCode_key" ON "Mouse"("mouseCode");

-- CreateIndex
CREATE UNIQUE INDEX "Cage_cageCode_key" ON "Cage"("cageCode");

-- CreateIndex
CREATE UNIQUE INDEX "Rack_name_key" ON "Rack"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentApproval_approvalNumber_key" ON "ExperimentApproval"("approvalNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceUsage_experimentApprovalId_mouseId_key" ON "ComplianceUsage"("experimentApprovalId", "mouseId");
