-- CreateTable
CREATE TABLE "StrainOwner" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "strainId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "StrainOwner_strainId_fkey" FOREIGN KEY ("strainId") REFERENCES "Strain" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StrainOwner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StrainOwner_strainId_userId_key" ON "StrainOwner"("strainId", "userId");
