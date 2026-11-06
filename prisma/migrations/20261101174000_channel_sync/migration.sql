-- CreateTable
CREATE TABLE "ChannelConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "host" TEXT,
    "port" INTEGER,
    "username" TEXT,
    "secret" TEXT,
    "mailbox" TEXT DEFAULT 'INBOX',
    "lookbackDays" INTEGER NOT NULL DEFAULT 3,
    "configJson" TEXT,
    "lastSyncAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChannelConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "IngestedMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "connectionId" TEXT,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "fromName" TEXT,
    "fromAddress" TEXT,
    "subject" TEXT,
    "receivedAt" DATETIME,
    "rawText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'FETCHED',
    "leadId" TEXT,
    "quoteId" TEXT,
    "errorText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IngestedMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IngestedMessage_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ChannelConnection" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "IngestedMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ChannelConnection_organizationId_enabled_idx" ON "ChannelConnection"("organizationId", "enabled");
CREATE UNIQUE INDEX "ChannelConnection_organizationId_label_key" ON "ChannelConnection"("organizationId", "label");
CREATE UNIQUE INDEX "IngestedMessage_organizationId_fingerprint_key" ON "IngestedMessage"("organizationId", "fingerprint");
CREATE INDEX "IngestedMessage_organizationId_status_idx" ON "IngestedMessage"("organizationId", "status");
CREATE INDEX "IngestedMessage_organizationId_source_idx" ON "IngestedMessage"("organizationId", "source");
