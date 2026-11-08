import type { SocialContentType, SocialPlatform, SocialPostStatus } from "@prisma/client";

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  "META_FACEBOOK",
  "META_INSTAGRAM",
  "TIKTOK",
  "LINKEDIN",
];

export const SOCIAL_CONTENT_TYPES: SocialContentType[] = ["POST", "STORY"];

export const socialPlatformLabel: Record<SocialPlatform, string> = {
  META_FACEBOOK: "Facebook",
  META_INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  LINKEDIN: "LinkedIn",
};

export const socialContentTypeLabel: Record<SocialContentType, string> = {
  POST: "Post",
  STORY: "Story",
};

export const socialPostStatusLabel: Record<SocialPostStatus, string> = {
  DRAFT: "Bozza",
  SCHEDULED: "Programmato",
  PUBLISHING: "In pubblicazione",
  PUBLISHED: "Pubblicato",
  FAILED: "Errore",
  CANCELLED: "Annullato",
};

/** Stories supported offline for Meta + TikTok; LinkedIn story → feed note in adapter. */
export function platformSupportsStories(platform: SocialPlatform): boolean {
  return platform === "META_FACEBOOK" || platform === "META_INSTAGRAM" || platform === "TIKTOK";
}

export function startOfWeek(d = new Date()): Date {
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() + diff);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
