-- CreateTable
CREATE TABLE "Center" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "statusId" TEXT NOT NULL,
    "taxId" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "places" INTEGER,
    "conditions" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Center_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "InsoleOrderOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Center_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "InsoleOrderOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CenterContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CenterContact_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InsoleOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "centerId" TEXT,
    "centerLink" TEXT,
    "typeId" TEXT NOT NULL,
    "side" TEXT NOT NULL DEFAULT 'BOTH',
    "shoeSize" REAL,
    "materialId" TEXT,
    "statusId" TEXT NOT NULL,
    "measuredAt" DATETIME,
    "dueAt" DATETIME,
    "priceCents" INTEGER,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InsoleOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InsoleOrder_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InsoleOrder_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "InsoleOrderOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InsoleOrder_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "InsoleOrderOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InsoleOrder_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "InsoleOrderOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_InsoleOrder" ("code", "createdAt", "dueAt", "id", "materialId", "measuredAt", "notes", "paid", "patientId", "priceCents", "shoeSize", "side", "statusId", "typeId", "updatedAt") SELECT "code", "createdAt", "dueAt", "id", "materialId", "measuredAt", "notes", "paid", "patientId", "priceCents", "shoeSize", "side", "statusId", "typeId", "updatedAt" FROM "InsoleOrder";
DROP TABLE "InsoleOrder";
ALTER TABLE "new_InsoleOrder" RENAME TO "InsoleOrder";
CREATE UNIQUE INDEX "InsoleOrder_code_key" ON "InsoleOrder"("code");
CREATE INDEX "InsoleOrder_patientId_idx" ON "InsoleOrder"("patientId");
CREATE INDEX "InsoleOrder_centerId_idx" ON "InsoleOrder"("centerId");
CREATE INDEX "InsoleOrder_statusId_idx" ON "InsoleOrder"("statusId");
CREATE TABLE "new_Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dni" TEXT,
    "birthDate" DATETIME,
    "phone" TEXT,
    "phoneAlt" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "healthCardNo" TEXT,
    "notes" TEXT,
    "gdprConsent" BOOLEAN NOT NULL DEFAULT false,
    "gdprConsentAt" DATETIME,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "centerId" TEXT,
    CONSTRAINT "Patient_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Patient" ("address", "archivedAt", "birthDate", "city", "createdAt", "dni", "email", "firstName", "gdprConsent", "gdprConsentAt", "healthCardNo", "id", "lastName", "marketingOptIn", "notes", "phone", "phoneAlt", "postalCode", "updatedAt") SELECT "address", "archivedAt", "birthDate", "city", "createdAt", "dni", "email", "firstName", "gdprConsent", "gdprConsentAt", "healthCardNo", "id", "lastName", "marketingOptIn", "notes", "phone", "phoneAlt", "postalCode", "updatedAt" FROM "Patient";
DROP TABLE "Patient";
ALTER TABLE "new_Patient" RENAME TO "Patient";
CREATE UNIQUE INDEX "Patient_dni_key" ON "Patient"("dni");
CREATE INDEX "Patient_lastName_firstName_idx" ON "Patient"("lastName", "firstName");
CREATE INDEX "Patient_centerId_idx" ON "Patient"("centerId");
CREATE INDEX "Patient_phone_idx" ON "Patient"("phone");
CREATE TABLE "new_TrackedProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serialNumber" TEXT NOT NULL,
    "lotNumber" TEXT,
    "categoryId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "description" TEXT,
    "udi" TEXT,
    "supplier" TEXT,
    "manufacturedAt" DATETIME,
    "centerId" TEXT,
    "patientId" TEXT,
    "purchasePriceCents" INTEGER,
    "salePriceCents" INTEGER,
    "isPublicHealth" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" DATETIME,
    "warrantyMonths" INTEGER NOT NULL DEFAULT 24,
    "warrantyUntil" DATETIME,
    "nextServiceAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrackedProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InsoleOrderOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TrackedProduct_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TrackedProduct_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TrackedProduct" ("brand", "categoryId", "createdAt", "deliveredAt", "description", "id", "isPublicHealth", "lotNumber", "manufacturedAt", "model", "nextServiceAt", "notes", "patientId", "purchasePriceCents", "salePriceCents", "serialNumber", "supplier", "udi", "updatedAt", "warrantyMonths", "warrantyUntil") SELECT "brand", "categoryId", "createdAt", "deliveredAt", "description", "id", "isPublicHealth", "lotNumber", "manufacturedAt", "model", "nextServiceAt", "notes", "patientId", "purchasePriceCents", "salePriceCents", "serialNumber", "supplier", "udi", "updatedAt", "warrantyMonths", "warrantyUntil" FROM "TrackedProduct";
DROP TABLE "TrackedProduct";
ALTER TABLE "new_TrackedProduct" RENAME TO "TrackedProduct";
CREATE UNIQUE INDEX "TrackedProduct_serialNumber_key" ON "TrackedProduct"("serialNumber");
CREATE INDEX "TrackedProduct_patientId_idx" ON "TrackedProduct"("patientId");
CREATE INDEX "TrackedProduct_warrantyUntil_idx" ON "TrackedProduct"("warrantyUntil");
CREATE TABLE "new_WorkOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "patientId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "centerId" TEXT,
    "centerLink" TEXT,
    "productId" TEXT,
    "equipmentCategoryId" TEXT NOT NULL,
    "equipmentBrand" TEXT,
    "equipmentModel" TEXT,
    "serialNumber" TEXT,
    "accessories" TEXT,
    "serviceTypeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "priorityId" TEXT NOT NULL,
    "underWarranty" BOOLEAN NOT NULL DEFAULT false,
    "reportedIssue" TEXT NOT NULL,
    "diagnosis" TEXT,
    "workDone" TEXT,
    "internalNotes" TEXT,
    "technicianId" TEXT,
    "laborMode" TEXT NOT NULL DEFAULT 'HOURLY',
    "laborRateCents" INTEGER,
    "laborFixedCents" INTEGER,
    "discountPercent" REAL NOT NULL DEFAULT 0,
    "taxRate" REAL NOT NULL DEFAULT 21,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promisedAt" DATETIME,
    "completedAt" DATETIME,
    "deliveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "TrackedProduct" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_equipmentCategoryId_fkey" FOREIGN KEY ("equipmentCategoryId") REFERENCES "InsoleOrderOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "InsoleOrderOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_priorityId_fkey" FOREIGN KEY ("priorityId") REFERENCES "InsoleOrderOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WorkOrder" ("accessories", "code", "completedAt", "createdAt", "customerName", "customerPhone", "deliveredAt", "diagnosis", "discountPercent", "equipmentBrand", "equipmentCategoryId", "equipmentModel", "id", "internalNotes", "laborFixedCents", "laborMode", "laborRateCents", "patientId", "priorityId", "productId", "promisedAt", "receivedAt", "reportedIssue", "serialNumber", "serviceTypeId", "status", "taxRate", "technicianId", "underWarranty", "updatedAt", "workDone") SELECT "accessories", "code", "completedAt", "createdAt", "customerName", "customerPhone", "deliveredAt", "diagnosis", "discountPercent", "equipmentBrand", "equipmentCategoryId", "equipmentModel", "id", "internalNotes", "laborFixedCents", "laborMode", "laborRateCents", "patientId", "priorityId", "productId", "promisedAt", "receivedAt", "reportedIssue", "serialNumber", "serviceTypeId", "status", "taxRate", "technicianId", "underWarranty", "updatedAt", "workDone" FROM "WorkOrder";
DROP TABLE "WorkOrder";
ALTER TABLE "new_WorkOrder" RENAME TO "WorkOrder";
CREATE UNIQUE INDEX "WorkOrder_code_key" ON "WorkOrder"("code");
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder"("status");
CREATE INDEX "WorkOrder_patientId_idx" ON "WorkOrder"("patientId");
CREATE INDEX "WorkOrder_productId_idx" ON "WorkOrder"("productId");
CREATE INDEX "WorkOrder_centerId_idx" ON "WorkOrder"("centerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Center_name_idx" ON "Center"("name");

-- CreateIndex
CREATE INDEX "CenterContact_centerId_idx" ON "CenterContact"("centerId");


-- Opciones iniciales de Centros (editables en Ajustes → Opciones → Centros)
INSERT INTO "InsoleOrderOption" ("id", "kind", "key", "label", "sortOrder", "active", "isFinal", "createdAt", "updatedAt") VALUES
    ('ct_private', 'CENTER_TYPE', NULL, 'Residencia privada', 10, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ct_daycare', 'CENTER_TYPE', NULL, 'Centro de día', 20, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ct_public', 'CENTER_TYPE', NULL, 'Residencia pública o concertada', 30, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ct_clinic', 'CENTER_TYPE', NULL, 'Clínica / fisioterapia', 40, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ct_other', 'CENTER_TYPE', NULL, 'Otro', 50, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('cs_prospect', 'CENTER_STATUS', 'PROSPECT', 'Posible cliente', 10, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('cs_active', 'CENTER_STATUS', 'ACTIVE', 'Activo', 20, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('cs_inactive', 'CENTER_STATUS', 'INACTIVE', 'Inactivo', 30, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000);
