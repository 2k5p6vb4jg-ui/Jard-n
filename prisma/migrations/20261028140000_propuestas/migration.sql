-- CreateTable
CREATE TABLE "CenterProposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intro" TEXT,
    "linesJson" TEXT NOT NULL,
    "discountPercent" REAL NOT NULL DEFAULT 0,
    "taxRate" REAL NOT NULL DEFAULT 21,
    "subtotalCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "billingPeriod" TEXT NOT NULL DEFAULT 'ONE_OFF',
    "durationMonths" INTEGER,
    "visitsPerYear" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" DATETIME NOT NULL,
    "decidedAt" DATETIME,
    "internalNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CenterProposal_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_CenterProposalToTrackedProduct" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_CenterProposalToTrackedProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "CenterProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CenterProposalToTrackedProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "TrackedProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CenterProposal_number_key" ON "CenterProposal"("number");

-- CreateIndex
CREATE INDEX "CenterProposal_centerId_idx" ON "CenterProposal"("centerId");

-- CreateIndex
CREATE UNIQUE INDEX "_CenterProposalToTrackedProduct_AB_unique" ON "_CenterProposalToTrackedProduct"("A", "B");

-- CreateIndex
CREATE INDEX "_CenterProposalToTrackedProduct_B_index" ON "_CenterProposalToTrackedProduct"("B");

