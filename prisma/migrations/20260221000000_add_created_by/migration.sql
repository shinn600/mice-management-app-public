-- Add createdBy field to track which user registered each record

ALTER TABLE "Mouse" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "GenotypingRecord" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "MatingPair" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "PlugCheck" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "Litter" ADD COLUMN "createdBy" TEXT;
