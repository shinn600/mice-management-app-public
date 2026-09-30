-- CreateTable
CREATE TABLE "Substrain" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "number" INTEGER NOT NULL,
    "strainId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Substrain_strainId_fkey" FOREIGN KEY ("strainId") REFERENCES "Strain" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Substrain_strainId_number_key" ON "Substrain"("strainId", "number");

-- AlterTable
ALTER TABLE "Mouse" ADD COLUMN "substrainId" INTEGER REFERENCES "Substrain"("id") ON DELETE SET NULL ON UPDATE CASCADE;
