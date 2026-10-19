-- CreateTable
CREATE TABLE "InsoleOrderOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InsoleOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
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
    CONSTRAINT "InsoleOrder_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "InsoleOrderOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InsoleOrder_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "InsoleOrderOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InsoleOrder_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "InsoleOrderOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "InsoleOrderOption_kind_sortOrder_idx" ON "InsoleOrderOption"("kind", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "InsoleOrderOption_kind_label_key" ON "InsoleOrderOption"("kind", "label");

-- CreateIndex
CREATE UNIQUE INDEX "InsoleOrder_code_key" ON "InsoleOrder"("code");

-- CreateIndex
CREATE INDEX "InsoleOrder_patientId_idx" ON "InsoleOrder"("patientId");

-- CreateIndex
CREATE INDEX "InsoleOrder_statusId_idx" ON "InsoleOrder"("statusId");

-- Opciones iniciales de la sección Plantillas (editables después en Ajustes)
INSERT INTO "InsoleOrderOption" ("id", "kind", "label", "sortOrder", "active", "isFinal", "createdAt", "updatedAt") VALUES
    ('opt_status_pending', 'STATUS', 'Pendiente de fabricar', 10, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('opt_status_making', 'STATUS', 'En fabricación', 20, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('opt_status_ready', 'STATUS', 'Lista para recoger', 30, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('opt_status_delivered', 'STATUS', 'Entregada', 40, true, true, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('opt_status_cancelled', 'STATUS', 'Anulada', 50, true, true, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('opt_type_daily', 'TYPE', 'Diario', 10, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('opt_type_sport', 'TYPE', 'Deportiva', 20, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('opt_type_dress', 'TYPE', 'Vestir', 30, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('opt_type_diabetic', 'TYPE', 'Diabético', 40, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('opt_type_kids', 'TYPE', 'Infantil', 50, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('opt_material_eva', 'MATERIAL', 'EVA', 10, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('opt_material_resin', 'MATERIAL', 'Resina', 20, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('opt_material_cork', 'MATERIAL', 'Corcho', 30, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('opt_material_poron', 'MATERIAL', 'Poron', 40, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
    ('opt_material_3d', 'MATERIAL', 'Impresión 3D', 50, true, false, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000);
