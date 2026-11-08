-- Contratto da conferma pratica + e-sign stub

CREATE TABLE "PracticeContract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "quoteId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "signToken" TEXT NOT NULL,
    "signerName" TEXT,
    "signerEmail" TEXT,
    "sentAt" DATETIME,
    "viewedAt" DATETIME,
    "signedAt" DATETIME,
    "declinedAt" DATETIME,
    "providerRef" TEXT,
    "signatureMetaJson" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PracticeContract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PracticeContract_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PracticeContract_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PracticeContract_signToken_key" ON "PracticeContract"("signToken");
CREATE INDEX "PracticeContract_organizationId_status_idx" ON "PracticeContract"("organizationId", "status");
CREATE INDEX "PracticeContract_practiceId_idx" ON "PracticeContract"("practiceId");
