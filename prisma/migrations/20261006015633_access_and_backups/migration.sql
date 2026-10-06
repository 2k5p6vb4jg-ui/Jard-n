-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "businessName" TEXT NOT NULL,
    "legalName" TEXT,
    "taxId" TEXT,
    "healthLicense" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "province" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logoPath" TEXT,
    "defaultHourlyRateCents" INTEGER NOT NULL DEFAULT 3500,
    "defaultTaxRate" REAL NOT NULL DEFAULT 21,
    "quoteValidityDays" INTEGER NOT NULL DEFAULT 30,
    "quoteLegalFooter" TEXT,
    "insoleRenewalMonths" INTEGER NOT NULL DEFAULT 12,
    "stockingRenewalMonths" INTEGER NOT NULL DEFAULT 6,
    "renewalWarningDays" INTEGER NOT NULL DEFAULT 30,
    "pinHash" TEXT,
    "sessionSecret" TEXT,
    "sessionHours" INTEGER NOT NULL DEFAULT 12,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "autoBackup" BOOLEAN NOT NULL DEFAULT true,
    "autoBackupKeep" INTEGER NOT NULL DEFAULT 14,
    "lastAutoBackupAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("address", "businessName", "city", "defaultHourlyRateCents", "defaultTaxRate", "email", "healthLicense", "id", "insoleRenewalMonths", "legalName", "logoPath", "phone", "postalCode", "province", "quoteLegalFooter", "quoteValidityDays", "renewalWarningDays", "stockingRenewalMonths", "taxId", "updatedAt", "website") SELECT "address", "businessName", "city", "defaultHourlyRateCents", "defaultTaxRate", "email", "healthLicense", "id", "insoleRenewalMonths", "legalName", "logoPath", "phone", "postalCode", "province", "quoteLegalFooter", "quoteValidityDays", "renewalWarningDays", "stockingRenewalMonths", "taxId", "updatedAt", "website" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
