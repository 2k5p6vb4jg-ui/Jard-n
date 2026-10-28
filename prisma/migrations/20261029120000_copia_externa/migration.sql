-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "backupMirrorDir" TEXT;
ALTER TABLE "Settings" ADD COLUMN "lastMirrorAt" DATETIME;
ALTER TABLE "Settings" ADD COLUMN "lastMirrorError" TEXT;

