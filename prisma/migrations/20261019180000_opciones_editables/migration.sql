-- AlterTable
ALTER TABLE "InsoleOrderOption" ADD COLUMN "key" TEXT;

-- Listas de Reparaciones que estaban fijas en el código: mismos valores y nombres.
-- El id conserva el valor anterior (ws_<lista>_<VALOR>) para convertir las columnas sin perder datos.
INSERT INTO "InsoleOrderOption" ("id", "kind", "key", "label", "sortOrder", "active", "isFinal", "createdAt", "updatedAt") VALUES
    ('ws_eq_MANUAL_WHEELCHAIR', 'EQUIPMENT_CATEGORY', 'MANUAL_WHEELCHAIR', 'Silla de ruedas manual', 10, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_eq_ELECTRIC_WHEELCHAIR', 'EQUIPMENT_CATEGORY', 'ELECTRIC_WHEELCHAIR', 'Silla de ruedas eléctrica', 20, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_eq_MOBILITY_SCOOTER', 'EQUIPMENT_CATEGORY', 'MOBILITY_SCOOTER', 'Scooter de movilidad', 30, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_eq_PATIENT_LIFT', 'EQUIPMENT_CATEGORY', 'PATIENT_LIFT', 'Grúa de traslado', 40, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_eq_WALKER', 'EQUIPMENT_CATEGORY', 'WALKER', 'Andador', 50, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_eq_ORTHOSIS', 'EQUIPMENT_CATEGORY', 'ORTHOSIS', 'Órtesis', 60, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_eq_PROSTHESIS', 'EQUIPMENT_CATEGORY', 'PROSTHESIS', 'Prótesis', 70, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_eq_MOTOR', 'EQUIPMENT_CATEGORY', 'MOTOR', 'Motor', 80, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_eq_OTHER', 'EQUIPMENT_CATEGORY', 'OTHER', 'Otro', 90, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_sv_GENERAL_REPAIR', 'SERVICE_TYPE', 'GENERAL_REPAIR', 'Reparación general', 10, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_sv_PREVENTIVE_MAINTENANCE', 'SERVICE_TYPE', 'PREVENTIVE_MAINTENANCE', 'Mantenimiento preventivo', 20, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_sv_BATTERY_REPLACEMENT', 'SERVICE_TYPE', 'BATTERY_REPLACEMENT', 'Cambio de baterías', 30, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_sv_CLEANING_DISINFECTION', 'SERVICE_TYPE', 'CLEANING_DISINFECTION', 'Limpieza y desinfección', 40, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_sv_CUSTOM_ADJUSTMENT', 'SERVICE_TYPE', 'CUSTOM_ADJUSTMENT', 'Ajuste a medida', 50, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_sv_WARRANTY', 'SERVICE_TYPE', 'WARRANTY', 'Garantía', 60, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_pc_RESIN', 'PART_CATEGORY', 'RESIN', 'Resina', 10, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_pc_EVA', 'PART_CATEGORY', 'EVA', 'EVA', 20, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_pc_THERMOPLASTIC', 'PART_CATEGORY', 'THERMOPLASTIC', 'Termoplástico', 30, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_pc_BATTERY', 'PART_CATEGORY', 'BATTERY', 'Batería', 40, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_pc_MOTOR', 'PART_CATEGORY', 'MOTOR', 'Motor', 50, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_pc_WHEEL', 'PART_CATEGORY', 'WHEEL', 'Rueda', 60, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_pc_SPARE_PART', 'PART_CATEGORY', 'SPARE_PART', 'Recambio', 70, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_pc_UPHOLSTERY', 'PART_CATEGORY', 'UPHOLSTERY', 'Tapicería', 80, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_pc_ELECTRONICS', 'PART_CATEGORY', 'ELECTRONICS', 'Electrónica', 90, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_pc_CONSUMABLE', 'PART_CATEGORY', 'CONSUMABLE', 'Consumible', 100, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_pc_OTHER', 'PART_CATEGORY', 'OTHER', 'Otro', 110, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_pr_LOW', 'PRIORITY', 'LOW', 'Baja', 10, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_pr_NORMAL', 'PRIORITY', 'NORMAL', 'Normal', 20, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_pr_HIGH', 'PRIORITY', 'HIGH', 'Alta', 30, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_pr_URGENT', 'PRIORITY', 'URGENT', 'Urgente', 40, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_st_RECEIVED', 'WORK_STATUS', 'RECEIVED', 'Entrada', 10, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_st_DIAGNOSIS', 'WORK_STATUS', 'DIAGNOSIS', 'Diagnóstico', 20, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_st_QUOTED', 'WORK_STATUS', 'QUOTED', 'Presupuestado', 30, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_st_IN_REPAIR', 'WORK_STATUS', 'IN_REPAIR', 'En reparación', 40, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_st_READY', 'WORK_STATUS', 'READY', 'Listo para entregar', 50, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_st_DELIVERED', 'WORK_STATUS', 'DELIVERED', 'Entregado', 60, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('ws_st_CANCELLED', 'WORK_STATUS', 'CANCELLED', 'Anulado', 70, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    CONSTRAINT "TrackedProduct_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TrackedProduct" ("categoryId", "brand", "createdAt", "deliveredAt", "description", "id", "isPublicHealth", "lotNumber", "manufacturedAt", "model", "nextServiceAt", "notes", "patientId", "purchasePriceCents", "salePriceCents", "serialNumber", "supplier", "udi", "updatedAt", "warrantyMonths", "warrantyUntil") SELECT 'ws_eq_' || "category", "brand", "createdAt", "deliveredAt", "description", "id", "isPublicHealth", "lotNumber", "manufacturedAt", "model", "nextServiceAt", "notes", "patientId", "purchasePriceCents", "salePriceCents", "serialNumber", "supplier", "udi", "updatedAt", "warrantyMonths", "warrantyUntil" FROM "TrackedProduct";
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
    CONSTRAINT "WorkOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "TrackedProduct" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_equipmentCategoryId_fkey" FOREIGN KEY ("equipmentCategoryId") REFERENCES "InsoleOrderOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "InsoleOrderOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_priorityId_fkey" FOREIGN KEY ("priorityId") REFERENCES "InsoleOrderOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WorkOrder" ("equipmentCategoryId", "serviceTypeId", "priorityId", "accessories", "code", "completedAt", "createdAt", "customerName", "customerPhone", "deliveredAt", "diagnosis", "discountPercent", "equipmentBrand", "equipmentModel", "id", "internalNotes", "laborFixedCents", "laborMode", "laborRateCents", "patientId", "productId", "promisedAt", "receivedAt", "reportedIssue", "serialNumber", "status", "taxRate", "technicianId", "underWarranty", "updatedAt", "workDone") SELECT 'ws_eq_' || "equipmentCategory", 'ws_sv_' || "serviceType", 'ws_pr_' || "priority", "accessories", "code", "completedAt", "createdAt", "customerName", "customerPhone", "deliveredAt", "diagnosis", "discountPercent", "equipmentBrand", "equipmentModel", "id", "internalNotes", "laborFixedCents", "laborMode", "laborRateCents", "patientId", "productId", "promisedAt", "receivedAt", "reportedIssue", "serialNumber", "status", "taxRate", "technicianId", "underWarranty", "updatedAt", "workDone" FROM "WorkOrder";
DROP TABLE "WorkOrder";
ALTER TABLE "new_WorkOrder" RENAME TO "WorkOrder";
CREATE UNIQUE INDEX "WorkOrder_code_key" ON "WorkOrder"("code");
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder"("status");
CREATE INDEX "WorkOrder_patientId_idx" ON "WorkOrder"("patientId");
CREATE INDEX "WorkOrder_productId_idx" ON "WorkOrder"("productId");
CREATE TABLE "new_WorkOrderPart" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workOrderId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "reference" TEXT,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'ud',
    "unitCostCents" INTEGER NOT NULL DEFAULT 0,
    "unitPriceCents" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkOrderPart_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkOrderPart_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InsoleOrderOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_WorkOrderPart" ("categoryId", "createdAt", "description", "id", "quantity", "reference", "unit", "unitCostCents", "unitPriceCents", "workOrderId") SELECT 'ws_pc_' || "category", "createdAt", "description", "id", "quantity", "reference", "unit", "unitCostCents", "unitPriceCents", "workOrderId" FROM "WorkOrderPart";
DROP TABLE "WorkOrderPart";
ALTER TABLE "new_WorkOrderPart" RENAME TO "WorkOrderPart";
CREATE INDEX "WorkOrderPart_workOrderId_idx" ON "WorkOrderPart"("workOrderId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "InsoleOrderOption_kind_key_key" ON "InsoleOrderOption"("kind", "key");

