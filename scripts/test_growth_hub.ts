/**
 * Offline tests for SEO checklist + AI audience list builder.
 * Run: npx tsx scripts/test_growth_hub.ts
 */
import assert from "node:assert/strict";
import { parseAudiencePrompt, buildAudienceFromLeads } from "../src/lib/growth/ai-lists";
import { runSeoChecklist } from "../src/lib/growth/seo-checklist";
import type { Lead } from "@prisma/client";

const seo = runSeoChecklist({
  brand: {
    name: "Yoyiyo",
    primaryColor: "#B33A2B",
    secondaryColor: "#0F3D3E",
    seoTitle: "Yoyiyo Cina",
    seoDescription: "TO Cina",
    tagline: "su misura",
  },
  site: {
    title: "Cina Classic",
    subtitle: "Ipotesi",
    slug: "cina-classic",
    ctaLabel: "Richiedi",
    status: "PUBLISHED",
    blocksJson: JSON.stringify([
      { type: "hero", title: "Ciao" },
      { type: "form", title: "Form" },
    ]),
    campaignId: "camp1",
  },
  campaignUtm: "cina",
});
assert.equal(seo.score, 100);
assert.ok(seo.checks.every((c) => c.ok));

const seoBad = runSeoChecklist({
  brand: {
    name: "X",
    primaryColor: "",
    secondaryColor: "",
    seoTitle: null,
    seoDescription: null,
    tagline: null,
  },
  site: {
    title: "",
    subtitle: null,
    slug: "Bad Slug!",
    ctaLabel: null,
    status: "DRAFT",
    blocksJson: "[]",
    campaignId: null,
  },
});
assert.ok(seoBad.score < 40);

const criteria = parseAudiencePrompt(
  "Lead Instagram nuovi interessati a Pechino con email",
);
assert.ok(criteria.sources?.includes("INSTAGRAM"));
assert.ok(criteria.stages?.includes("NEW"));
assert.equal(criteria.hasEmail, true);
assert.equal(criteria.query, "pechino");

const group = parseAudiencePrompt("Groupage >20 da WhatsApp con telefono");
assert.ok(group.clientTypes?.includes("GROUP"));
assert.equal(group.minPax, 20);
assert.ok(group.sources?.includes("WHATSAPP"));
assert.equal(group.hasPhone, true);

const leads = [
  {
    id: "1",
    firstName: "Sara",
    lastName: "IG",
    email: "sara@ex.com",
    phone: null,
    source: "INSTAGRAM",
    pipelineStage: "NEW",
    clientType: "B2C",
    brandId: "b1",
    paxCount: 2,
    interest: "Pechino e Shanghai",
    rawSourceText: null,
    notes: null,
  },
  {
    id: "2",
    firstName: "Luca",
    lastName: "WA",
    email: null,
    phone: "+39333",
    source: "WHATSAPP",
    pipelineStage: "QUALIFIED",
    clientType: "GROUP",
    brandId: "b1",
    paxCount: 22,
    interest: "Guilin",
    rawSourceText: null,
    notes: null,
  },
] as unknown as Lead[];

const built = buildAudienceFromLeads(leads, criteria);
assert.equal(built.members.length, 1);
assert.equal(built.members[0].leadId, "1");

const groupBuilt = buildAudienceFromLeads(leads, group);
assert.equal(groupBuilt.members.length, 1);
assert.equal(groupBuilt.members[0].leadId, "2");

console.log("OK growth-hub", {
  seoScore: seo.score,
  seoBad: seoBad.score,
  igMembers: built.members.length,
  groupMembers: groupBuilt.members.length,
});
