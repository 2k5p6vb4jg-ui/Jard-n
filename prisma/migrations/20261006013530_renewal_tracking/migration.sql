-- AlterTable
ALTER TABLE "CompressionStocking" ADD COLUMN "renewalSnoozedUntil" DATETIME;
ALTER TABLE "CompressionStocking" ADD COLUMN "renewalUpdatedAt" DATETIME;

-- AlterTable
ALTER TABLE "InsolePrescription" ADD COLUMN "renewalSnoozedUntil" DATETIME;
ALTER TABLE "InsolePrescription" ADD COLUMN "renewalUpdatedAt" DATETIME;
