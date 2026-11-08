/**
 * Offline tests for social sandbox publish + schedule validation.
 * Run: npx tsx scripts/test_social_scheduler.ts
 */
import assert from "node:assert/strict";
import {
  publishSocialSandbox,
  validateScheduleAt,
} from "../src/lib/social/sandbox-publish";
import {
  SOCIAL_PLATFORMS,
  platformSupportsStories,
  socialPlatformLabel,
  startOfWeek,
  addDays,
} from "../src/lib/social/platforms";

assert.equal(SOCIAL_PLATFORMS.length, 4);
assert.ok(platformSupportsStories("META_INSTAGRAM"));
assert.ok(platformSupportsStories("TIKTOK"));
assert.equal(platformSupportsStories("LINKEDIN"), false);
assert.equal(socialPlatformLabel.TIKTOK, "TikTok");

const week = startOfWeek(new Date("2026-11-08T12:00:00Z"));
assert.equal(week.getDay(), 1); // Monday
assert.equal(addDays(week, 6).getDay(), 0);

assert.equal(validateScheduleAt(null, "DRAFT"), null);
assert.ok(validateScheduleAt(null, "SCHEDULED"));
assert.ok(validateScheduleAt(new Date(Date.now() - 3600_000), "SCHEDULED"));
assert.equal(validateScheduleAt(new Date(Date.now() + 3600_000), "SCHEDULED"), null);

async function main() {
  const igPost = await publishSocialSandbox({
    platform: "META_INSTAGRAM",
    contentType: "POST",
    body: "Cina Classic — ipotesi su misura",
  });
  assert.equal(igPost.ok, true);
  assert.equal(igPost.simulated, true);
  assert.ok(igPost.providerPostId?.startsWith("sandbox-ig-post-"));

  const ttStory = await publishSocialSandbox({
    platform: "TIKTOK",
    contentType: "STORY",
    body: "Story groupage",
  });
  assert.equal(ttStory.ok, true);
  assert.ok(ttStory.providerPostId?.includes("story"));

  const liStory = await publishSocialSandbox({
    platform: "LINKEDIN",
    contentType: "STORY",
    body: "Story → feed",
  });
  assert.equal(liStory.ok, true);
  assert.ok(liStory.note?.toLowerCase().includes("linkedin"));

  const empty = await publishSocialSandbox({
    platform: "META_FACEBOOK",
    contentType: "POST",
    body: "   ",
  });
  assert.equal(empty.ok, false);

  console.log("OK social-scheduler", {
    platforms: SOCIAL_PLATFORMS,
    igPost: igPost.providerPostId,
    ttStory: ttStory.providerPostId,
    liStory: liStory.providerPostId,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
