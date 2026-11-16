/**
 * Offline tests for Trattativa 360 next-action + timeline helpers.
 * Run: npx tsx scripts/test_trattativa_360.ts
 */
import assert from "node:assert/strict";
import {
  buildStageHistory,
  buildTrattativaTimeline,
  computeNextAction,
} from "../src/lib/crm/trattativa";

const unread = computeNextAction({
  leadId: "l1",
  pipelineStage: "QUOTING",
  intakeStatus: "QUOTED",
  missingFields: [],
  unreadCount: 2,
  primaryThreadId: "t1",
  quotes: [{ id: "q1", status: "SENT", number: "QT-1" }],
  practices: [],
  contracts: [],
  invoicesAr: [],
});
assert.equal(unread.code, "UNREAD");
assert.ok(unread.href?.includes("/app/inbox/t1"));

const createQuote = computeNextAction({
  leadId: "l1",
  pipelineStage: "QUALIFIED",
  intakeStatus: "READY_TO_QUOTE",
  missingFields: [],
  unreadCount: 0,
  quotes: [],
  practices: [],
  contracts: [],
  invoicesAr: [],
});
assert.equal(createQuote.code, "CREATE_QUOTE");

const sign = computeNextAction({
  leadId: "l1",
  pipelineStage: "NEGOTIATION",
  intakeStatus: "QUOTED",
  missingFields: [],
  unreadCount: 0,
  quotes: [{ id: "q1", status: "SENT", number: "QT-1" }],
  practices: [{ id: "p1", status: "CONFIRMED", reference: "PRA-1" }],
  contracts: [{ id: "c1", practiceId: "p1", status: "SENT" }],
  invoicesAr: [],
});
assert.equal(sign.code, "SIGN");
assert.ok(sign.href?.includes("/contratti/c1"));

const created = new Date("2026-01-01T10:00:00Z");
const history = buildStageHistory({
  createdAt: created,
  currentStage: "QUOTING",
  audits: [
    {
      action: "LEAD_STAGE_CHANGE",
      createdAt: new Date("2026-01-02T10:00:00Z"),
      metaJson: JSON.stringify({ from: "NEW", to: "CONTACTED" }),
    },
    {
      action: "LEAD_STAGE_CHANGE",
      createdAt: new Date("2026-01-03T10:00:00Z"),
      metaJson: JSON.stringify({ from: "CONTACTED", to: "QUOTING" }),
    },
  ],
});
assert.equal(history[0].stage, "NEW");
assert.equal(history.at(-1)?.stage, "QUOTING");
assert.ok(history.some((h) => h.stage === "CONTACTED" && h.source === "audit"));

const timeline = buildTrattativaTimeline({
  leadCreatedAt: created,
  stageHistory: history,
  messages: [
    {
      id: "m1",
      createdAt: new Date("2026-01-01T12:00:00Z"),
      direction: "IN",
      body: "Ciao vorrei un viaggio in Cina",
      status: "LOGGED",
    },
  ],
  threads: [
    {
      id: "t1",
      lastAt: new Date("2026-01-04T09:00:00Z"),
      lastBody: "Ok vi mando il preventivo",
      unreadCount: 0,
      status: "OPEN",
      contactName: "Laura",
    },
  ],
  quotes: [
    {
      id: "q1",
      number: "QT-1",
      title: "Cina",
      status: "SENT",
      createdAt: new Date("2026-01-03T15:00:00Z"),
      totalSell: 1000,
    },
  ],
  practices: [],
  contracts: [],
  invoices: [],
});
assert.ok(timeline.length >= 4);
assert.ok(timeline[0].at.getTime() >= timeline[1].at.getTime());
assert.ok(timeline.some((t) => t.kind === "quote"));
assert.ok(timeline.some((t) => t.kind === "message"));

console.log("OK trattativa-360", {
  unread: unread.code,
  createQuote: createQuote.code,
  sign: sign.code,
  stages: history.map((h) => h.stage),
  timelineKinds: [...new Set(timeline.map((t) => t.kind))],
});
