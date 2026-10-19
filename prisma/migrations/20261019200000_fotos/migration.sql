-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workOrderId" TEXT,
    "insoleOrderId" TEXT,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Photo_insoleOrderId_fkey" FOREIGN KEY ("insoleOrderId") REFERENCES "InsoleOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Photo_storagePath_key" ON "Photo"("storagePath");

-- CreateIndex
CREATE INDEX "Photo_workOrderId_idx" ON "Photo"("workOrderId");

-- CreateIndex
CREATE INDEX "Photo_insoleOrderId_idx" ON "Photo"("insoleOrderId");

