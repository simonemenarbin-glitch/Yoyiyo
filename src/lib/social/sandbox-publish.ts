import type { SocialContentType, SocialPlatform } from "@prisma/client";
import { platformSupportsStories } from "./platforms";

export type SocialPublishInput = {
  platform: SocialPlatform;
  contentType: SocialContentType;
  body: string;
  title?: string | null;
  mediaUrl?: string | null;
  linkUrl?: string | null;
  extrasJson?: string | null;
};

export type SocialPublishResult = {
  ok: boolean;
  simulated: boolean;
  providerPostId?: string;
  error?: string;
  note?: string;
};

/**
 * Offline adapters — never call live Meta/TikTok/LinkedIn APIs.
 * Live path can be added later behind env tokens without changing the UI.
 */
export async function publishSocialSandbox(
  input: SocialPublishInput,
): Promise<SocialPublishResult> {
  if (!input.body.trim()) {
    return { ok: false, simulated: true, error: "Testo vuoto" };
  }

  if (input.contentType === "STORY" && !platformSupportsStories(input.platform)) {
    // LinkedIn has no classic Stories — degrade to feed note in sandbox
    if (input.platform === "LINKEDIN") {
      return {
        ok: true,
        simulated: true,
        providerPostId: `sandbox-li-story-as-post-${Date.now()}`,
        note: "LinkedIn non ha Stories: pubblicato come post feed (sandbox).",
      };
    }
    return {
      ok: false,
      simulated: true,
      error: `Stories non supportate su ${input.platform}`,
    };
  }

  const prefix =
    input.platform === "META_FACEBOOK"
      ? "sandbox-fb"
      : input.platform === "META_INSTAGRAM"
        ? "sandbox-ig"
        : input.platform === "TIKTOK"
          ? "sandbox-tt"
          : "sandbox-li";

  const kind = input.contentType === "STORY" ? "story" : "post";

  // Tiny artificial delay to mimic network without flaking tests
  await Promise.resolve();

  return {
    ok: true,
    simulated: true,
    providerPostId: `${prefix}-${kind}-${Date.now().toString(36)}`,
    note: `Sandbox ${input.platform} ${kind}: nessun token live usato.`,
  };
}

export function validateScheduleAt(scheduledAt: Date | null, statusIntent: "DRAFT" | "SCHEDULED") {
  if (statusIntent !== "SCHEDULED") return null;
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    return "Data/ora di programmazione mancante o non valida";
  }
  // Allow near-past (1 min) for demo clocks
  if (scheduledAt.getTime() < Date.now() - 60_000) {
    return "La programmazione deve essere nel futuro";
  }
  return null;
}
