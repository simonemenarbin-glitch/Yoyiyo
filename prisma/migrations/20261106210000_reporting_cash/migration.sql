-- CreateTable
CREATE TABLE "CashDeadline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "practiceId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'DEPOSIT',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "label" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "paidAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CashDeadline_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CashDeadline_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CashDeadline_organizationId_dueDate_idx" ON "CashDeadline"("organizationId", "dueDate");
CREATE INDEX "CashDeadline_organizationId_status_idx" ON "CashDeadline"("organizationId", "status");
CREATE INDEX "CashDeadline_practiceId_idx" ON "CashDeadline"("practiceId");
