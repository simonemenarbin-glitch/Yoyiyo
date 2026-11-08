/**
 * Offline tests for landing templates + block parsing (no DB required).
 * Run: npx tsx scripts/test_landing_builder.ts
 */
import assert from "node:assert/strict";
import {
  applyLandingTemplate,
  LANDING_TEMPLATES,
  getLandingTemplate,
} from "../src/lib/brand/templates";
import {
  parseSiteBlocks,
  countBlockTypes,
  siteBlocksToSimpleFields,
  defaultLandingBlocks,
} from "../src/lib/brand/metrics";

assert.equal(LANDING_TEMPLATES.length >= 5, true, "at least 5 templates");
assert.ok(getLandingTemplate("fit-cina"));
assert.equal(getLandingTemplate("nope"), null);

const applied = applyLandingTemplate("groupage", "Cina in Gruppo");
assert.ok(applied);
assert.equal(applied.pageType, "LANDING");
assert.ok(applied.blocks.some((b) => b.type === "hero"));
assert.ok(applied.blocks.some((b) => b.type === "form"));

const fit = applyLandingTemplate("fit-cina", "Yoyiyo");
assert.ok(fit);
assert.ok(fit.blocks.some((b) => b.type === "gallery"));
assert.ok(fit.blocks.some((b) => b.type === "faq"));

const parsed = parseSiteBlocks(JSON.stringify(fit.blocks), "Yoyiyo");
assert.equal(parsed.length, fit.blocks.length);
const counts = countBlockTypes(parsed);
assert.ok((counts.hero || 0) >= 1);
assert.ok((counts.form || 0) >= 1);

const broken = parseSiteBlocks("{not-json", "Yoyiyo");
assert.deepEqual(
  broken.map((b) => b.type),
  defaultLandingBlocks("Yoyiyo").map((b) => b.type),
);

const simple = siteBlocksToSimpleFields(JSON.stringify(fit.blocks), "Yoyiyo");
assert.ok(simple.heroTitle.length > 0);
assert.ok(simple.galleryCaptions.length > 0);
assert.ok(simple.faq1Q.length > 0);

const partner = applyLandingTemplate("partner-b2b", "Yoyiyo");
assert.ok(partner?.blocks.some((b) => b.type === "form"));

const short = applyLandingTemplate("short-form", "Yoyiyo");
assert.equal(short?.pageType, "FORM");

const evento = applyLandingTemplate("evento-fiera", "Yoyiyo");
assert.ok(evento?.blocks.some((b) => b.type === "gallery"));

console.log("OK landing-builder", {
  templates: LANDING_TEMPLATES.map((t) => t.id),
  fitBlocks: fit.blocks.map((b) => b.type),
  groupageBlocks: applied.blocks.map((b) => b.type),
});
