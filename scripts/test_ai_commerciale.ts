/**
 * Offline tests for AI commerciale preview (parse + evaluate on inbox-like text).
 * Run: npx tsx scripts/test_ai_commerciale.ts
 */
import assert from "node:assert/strict";
import { previewCommercialDecision, summarizeCommercialAi } from "../src/lib/intake/from-inbox";

const ready = previewCommercialDecision(
  "Buongiorno, sono Luca Neri, email luca@example.com, telefono +393331112233. Siamo in 2 persone, viaggio FIT Pechino e Shanghai, 10 giorni a maggio 2027, budget 2200 euro.",
  "WhatsApp",
);
assert.equal(ready.decision.kind, "READY_TO_QUOTE");
assert.ok((ready.parsed.destinations || []).length >= 1);
assert.ok((ready.parsed.paxCount || 0) >= 2);

const needs = previewCommercialDecision("Ciao quanto costa la Cina?", "Instagram");
assert.equal(needs.decision.kind, "NEEDS_INFO");
assert.ok(needs.decision.missing.length > 0);

const summary = summarizeCommercialAi({
  leadId: "x",
  quoteId: "q1",
  decision: "READY_TO_QUOTE",
  missing: [],
  pipelineStage: "QUOTING",
  intakeStatus: "QUOTED",
});
assert.ok(summary.toLowerCase().includes("preventivo"));

console.log("OK ai-commerciale", {
  ready: ready.decision.kind,
  needs: needs.decision.kind,
  missing: needs.decision.missing,
  summary,
});
