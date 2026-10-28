-- CreateTable
CREATE TABLE "MaintenanceVisit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT NOT NULL,
    "dueAt" DATETIME NOT NULL,
    "workOrderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaintenanceVisit_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "CenterProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceVisit_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceVisit_workOrderId_key" ON "MaintenanceVisit"("workOrderId");

-- CreateIndex
CREATE INDEX "MaintenanceVisit_proposalId_idx" ON "MaintenanceVisit"("proposalId");

-- CreateIndex
CREATE INDEX "MaintenanceVisit_dueAt_idx" ON "MaintenanceVisit"("dueAt");

