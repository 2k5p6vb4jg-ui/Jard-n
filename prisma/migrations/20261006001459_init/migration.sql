-- CreateTable
CREATE TABLE "Settings" (
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Patient" (
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InsolePrescription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "insoleType" TEXT NOT NULL DEFAULT 'DAILY',
    "side" TEXT NOT NULL DEFAULT 'BOTH',
    "diagnosisNotes" TEXT,
    "prescribedBy" TEXT,
    "material" TEXT NOT NULL DEFAULT 'EVA',
    "shoreDensity" INTEGER,
    "baseMaterial" TEXT,
    "baseDensity" INTEGER,
    "finish" TEXT NOT NULL DEFAULT 'NONE',
    "thicknessMm" REAL,
    "shoeSize" REAL,
    "footLengthLeftMm" REAL,
    "footLengthRightMm" REAL,
    "footWidthLeftMm" REAL,
    "footWidthRightMm" REAL,
    "archHeightLeftMm" REAL,
    "archHeightRightMm" REAL,
    "heelLiftMm" REAL,
    "technicalNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priceCents" INTEGER,
    "measuredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" DATETIME,
    "nextReviewAt" DATETIME,
    "renewalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "renewalNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InsolePrescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InsolePathology" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "insoleId" TEXT NOT NULL,
    "pathology" TEXT NOT NULL,
    "side" TEXT NOT NULL DEFAULT 'BOTH',
    "notes" TEXT,
    CONSTRAINT "InsolePathology_insoleId_fkey" FOREIGN KEY ("insoleId") REFERENCES "InsolePrescription" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InsoleCorrection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "insoleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "side" TEXT NOT NULL DEFAULT 'BOTH',
    "valueMm" REAL,
    "notes" TEXT,
    CONSTRAINT "InsoleCorrection_insoleId_fkey" FOREIGN KEY ("insoleId") REFERENCES "InsolePrescription" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompressionStocking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "compressionClass" TEXT NOT NULL,
    "garmentType" TEXT NOT NULL,
    "knitType" TEXT NOT NULL DEFAULT 'CIRCULAR',
    "side" TEXT NOT NULL DEFAULT 'BOTH',
    "madeToMeasure" BOOLEAN NOT NULL DEFAULT false,
    "brand" TEXT,
    "model" TEXT,
    "color" TEXT,
    "openToe" BOOLEAN NOT NULL DEFAULT false,
    "diagnosis" TEXT,
    "cB" REAL,
    "cB1" REAL,
    "cC" REAL,
    "cD" REAL,
    "cE" REAL,
    "cF" REAL,
    "cG" REAL,
    "cH" REAL,
    "cT" REAL,
    "cY" REAL,
    "lAB1" REAL,
    "lAC" REAL,
    "lAD" REAL,
    "lAE" REAL,
    "lAF" REAL,
    "lAG" REAL,
    "lAT" REAL,
    "footLengthCm" REAL,
    "measurementNotes" TEXT,
    "prescribingDoctor" TEXT,
    "doctorLicenseNo" TEXT,
    "prescriptionNumber" TEXT,
    "prescriptionDate" DATETIME,
    "isPublicHealth" BOOLEAN NOT NULL DEFAULT false,
    "publicHealthCode" TEXT,
    "patientContribCents" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priceCents" INTEGER,
    "measuredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" DATETIME,
    "nextReviewAt" DATETIME,
    "renewalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "renewalNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CompressionStocking_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClinicalDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "insoleId" TEXT,
    "stockingId" TEXT,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'UPLOAD',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "originalName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT,
    "takenAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClinicalDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicalDocument_insoleId_fkey" FOREIGN KEY ("insoleId") REFERENCES "InsolePrescription" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ClinicalDocument_stockingId_fkey" FOREIGN KEY ("stockingId") REFERENCES "CompressionStocking" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Technician" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "hourlyRateCents" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "pin" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "patientId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "productId" TEXT,
    "equipmentCategory" TEXT NOT NULL,
    "equipmentBrand" TEXT,
    "equipmentModel" TEXT,
    "serialNumber" TEXT,
    "accessories" TEXT,
    "serviceType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
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
    CONSTRAINT "WorkOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "TrackedProduct" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkOrderPart" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workOrderId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "reference" TEXT,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'ud',
    "unitCostCents" INTEGER NOT NULL DEFAULT 0,
    "unitPriceCents" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkOrderPart_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workOrderId" TEXT NOT NULL,
    "technicianId" TEXT,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "minutes" INTEGER,
    "description" TEXT,
    CONSTRAINT "TimeEntry_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkOrderStatusChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workOrderId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkOrderStatusChange_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" DATETIME NOT NULL,
    "partsCents" INTEGER NOT NULL,
    "laborCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "subtotalCents" INTEGER NOT NULL,
    "taxRate" REAL NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "notes" TEXT,
    "linesJson" TEXT NOT NULL,
    "pdfPath" TEXT,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Quote_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrackedProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serialNumber" TEXT NOT NULL,
    "lotNumber" TEXT,
    "category" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "description" TEXT,
    "udi" TEXT,
    "supplier" TEXT,
    "manufacturedAt" DATETIME,
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
    CONSTRAINT "TrackedProduct_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductIntervention" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "underWarranty" BOOLEAN NOT NULL DEFAULT false,
    "workOrderId" TEXT,
    "technicianId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductIntervention_productId_fkey" FOREIGN KEY ("productId") REFERENCES "TrackedProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductIntervention_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProductIntervention_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BackupRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Patient_dni_key" ON "Patient"("dni");

-- CreateIndex
CREATE INDEX "Patient_lastName_firstName_idx" ON "Patient"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Patient_phone_idx" ON "Patient"("phone");

-- CreateIndex
CREATE INDEX "InsolePrescription_patientId_idx" ON "InsolePrescription"("patientId");

-- CreateIndex
CREATE INDEX "InsolePrescription_nextReviewAt_renewalStatus_idx" ON "InsolePrescription"("nextReviewAt", "renewalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "InsolePathology_insoleId_pathology_side_key" ON "InsolePathology"("insoleId", "pathology", "side");

-- CreateIndex
CREATE INDEX "InsoleCorrection_insoleId_idx" ON "InsoleCorrection"("insoleId");

-- CreateIndex
CREATE INDEX "CompressionStocking_patientId_idx" ON "CompressionStocking"("patientId");

-- CreateIndex
CREATE INDEX "CompressionStocking_nextReviewAt_renewalStatus_idx" ON "CompressionStocking"("nextReviewAt", "renewalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalDocument_storagePath_key" ON "ClinicalDocument"("storagePath");

-- CreateIndex
CREATE INDEX "ClinicalDocument_patientId_type_idx" ON "ClinicalDocument"("patientId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_code_key" ON "WorkOrder"("code");

-- CreateIndex
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder"("status");

-- CreateIndex
CREATE INDEX "WorkOrder_patientId_idx" ON "WorkOrder"("patientId");

-- CreateIndex
CREATE INDEX "WorkOrder_productId_idx" ON "WorkOrder"("productId");

-- CreateIndex
CREATE INDEX "WorkOrderPart_workOrderId_idx" ON "WorkOrderPart"("workOrderId");

-- CreateIndex
CREATE INDEX "TimeEntry_workOrderId_idx" ON "TimeEntry"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderStatusChange_workOrderId_changedAt_idx" ON "WorkOrderStatusChange"("workOrderId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_number_key" ON "Quote"("number");

-- CreateIndex
CREATE INDEX "Quote_workOrderId_idx" ON "Quote"("workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedProduct_serialNumber_key" ON "TrackedProduct"("serialNumber");

-- CreateIndex
CREATE INDEX "TrackedProduct_patientId_idx" ON "TrackedProduct"("patientId");

-- CreateIndex
CREATE INDEX "TrackedProduct_warrantyUntil_idx" ON "TrackedProduct"("warrantyUntil");

-- CreateIndex
CREATE INDEX "ProductIntervention_productId_date_idx" ON "ProductIntervention"("productId", "date");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
