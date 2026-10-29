-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "image" BLOB NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerDni" TEXT,
    "text" TEXT,
    "collectedBy" TEXT,
    "ip" TEXT,
    "signedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workOrderId" TEXT,
    "quoteId" TEXT,
    "proposalId" TEXT,
    "patientId" TEXT,
    CONSTRAINT "Signature_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Signature_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Signature_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "CenterProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Signature_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Signature_quoteId_key" ON "Signature"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Signature_proposalId_key" ON "Signature"("proposalId");

-- CreateIndex
CREATE INDEX "Signature_workOrderId_idx" ON "Signature"("workOrderId");

-- CreateIndex
CREATE INDEX "Signature_patientId_idx" ON "Signature"("patientId");

