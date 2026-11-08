-- Unified inbox: threads for DM + comments across Meta/WA/mail stubs

CREATE TABLE "InboxThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "connectionId" TEXT,
    "leadId" TEXT,
    "brandId" TEXT,
    "source" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'DM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "externalThreadId" TEXT NOT NULL,
    "contactName" TEXT,
    "contactHandle" TEXT,
    "subject" TEXT,
    "lastBody" TEXT,
    "lastAt" DATETIME,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "permalink" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InboxThread_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InboxThread_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ChannelConnection" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InboxThread_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InboxThread_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InboxThread_organizationId_externalThreadId_key" ON "InboxThread"("organizationId", "externalThreadId");
CREATE INDEX "InboxThread_organizationId_status_lastAt_idx" ON "InboxThread"("organizationId", "status", "lastAt");
CREATE INDEX "InboxThread_organizationId_source_kind_idx" ON "InboxThread"("organizationId", "source", "kind");
CREATE INDEX "InboxThread_organizationId_leadId_idx" ON "InboxThread"("organizationId", "leadId");

ALTER TABLE "ConversationMessage" ADD COLUMN "threadId" TEXT;
ALTER TABLE "ConversationMessage" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'DM';
ALTER TABLE "ConversationMessage" ADD COLUMN "unread" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ConversationMessage" ADD COLUMN "externalId" TEXT;
ALTER TABLE "ConversationMessage" ADD COLUMN "permalink" TEXT;

CREATE INDEX "ConversationMessage_threadId_createdAt_idx" ON "ConversationMessage"("threadId", "createdAt");
CREATE INDEX "ConversationMessage_organizationId_unread_idx" ON "ConversationMessage"("organizationId", "unread");
