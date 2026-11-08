/**
 * Offline tests for unified inbox sandbox samples + sync helpers.
 * Run: npx tsx scripts/test_inbox_sandbox.ts
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { SANDBOX_INBOX_SAMPLES, conversationKindLabel } from "../src/lib/inbox/types";
import { syncSandboxInbox } from "../src/lib/inbox/sandbox-sync";

assert.ok(SANDBOX_INBOX_SAMPLES.length >= 6);
assert.ok(SANDBOX_INBOX_SAMPLES.some((s) => s.kind === "DM"));
assert.ok(SANDBOX_INBOX_SAMPLES.some((s) => s.kind === "COMMENT"));
assert.ok(SANDBOX_INBOX_SAMPLES.some((s) => s.source === "WHATSAPP"));
assert.ok(SANDBOX_INBOX_SAMPLES.some((s) => s.source === "EMAIL"));
assert.equal(conversationKindLabel("COMMENT"), "Commento");

async function main() {
  const dbUrl = "file:./prisma/test-inbox.db";
  process.env.DATABASE_URL = dbUrl;

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: dbUrl },
  });
  execSync("npx prisma generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: dbUrl },
  });

  const db = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  await db.conversationMessage.deleteMany();
  await db.inboxThread.deleteMany();
  await db.lead.deleteMany();
  await db.channelConnection.deleteMany();
  await db.brand.deleteMany();
  await db.membership.deleteMany();
  await db.user.deleteMany();
  await db.organization.deleteMany();

  const org = await db.organization.create({
    data: {
      name: "Inbox Test Org",
      slug: `inbox-test-${Date.now()}`,
      brands: {
        create: [{ name: "Yoyiyo", slug: "yoyiyo", primaryColor: "#B33A2B" }],
      },
    },
  });

  const first = await syncSandboxInbox(db, org.id);
  assert.equal(first.threadsUpserted, SANDBOX_INBOX_SAMPLES.length);
  assert.ok(first.messagesCreated >= SANDBOX_INBOX_SAMPLES.length);
  assert.ok(first.leadsCreated >= 1);

  const second = await syncSandboxInbox(db, org.id);
  assert.equal(second.threadsUpserted, SANDBOX_INBOX_SAMPLES.length);
  assert.equal(second.messagesCreated, 0, "idempotent: no duplicate messages");

  const comments = await db.inboxThread.count({
    where: { organizationId: org.id, kind: "COMMENT" },
  });
  assert.ok(comments >= 2);

  const withLead = await db.inboxThread.count({
    where: { organizationId: org.id, leadId: { not: null } },
  });
  assert.equal(withLead, SANDBOX_INBOX_SAMPLES.length);

  console.log("OK inbox-sandbox", { first, second, comments, withLead });
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
