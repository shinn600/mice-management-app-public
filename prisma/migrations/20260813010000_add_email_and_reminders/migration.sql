-- AlterTable
ALTER TABLE "User" ADD COLUMN "email" TEXT;

-- AlterTable
ALTER TABLE "PlugCheck" ADD COLUMN "birthReminderSentAt" DATETIME;

-- AlterTable
ALTER TABLE "Litter" ADD COLUMN "weanReminderSentAt" DATETIME;
