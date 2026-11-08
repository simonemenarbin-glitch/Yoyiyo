"use server";

import { redirect } from "next/navigation";
import type {
  SocialContentType,
  SocialPlatform,
  SocialPostStatus,
} from "@prisma/client";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  publishSocialSandbox,
  validateScheduleAt,
} from "@/lib/social/sandbox-publish";

function parsePlatform(raw: string): SocialPlatform {
  const v = raw as SocialPlatform;
  if (
    v === "META_FACEBOOK" ||
    v === "META_INSTAGRAM" ||
    v === "TIKTOK" ||
    v === "LINKEDIN"
  ) {
    return v;
  }
  return "META_INSTAGRAM";
}

export async function upsertSocialPost(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;

  const id = String(formData.get("id") || "");
  const brandId = String(formData.get("brandId") || "");
  const brand = await prisma.brand.findFirst({
    where: { id: brandId, organizationId: orgId },
  });
  if (!brand) redirect("/app/social");

  const intent = String(formData.get("intent") || "DRAFT") as "DRAFT" | "SCHEDULED";
  const scheduledRaw = String(formData.get("scheduledAt") || "").trim();
  const scheduledAt = scheduledRaw ? new Date(scheduledRaw) : null;
  const scheduleErr = validateScheduleAt(scheduledAt, intent);
  if (scheduleErr) {
    redirect(`/app/social?err=${encodeURIComponent(scheduleErr)}`);
  }

  const data = {
    brandId,
    campaignId: String(formData.get("campaignId") || "") || null,
    platform: parsePlatform(String(formData.get("platform") || "")),
    contentType: (String(formData.get("contentType") || "POST") as SocialContentType) || "POST",
    title: String(formData.get("title") || "").trim() || null,
    body: String(formData.get("body") || "").trim(),
    mediaUrl: String(formData.get("mediaUrl") || "").trim() || null,
    mediaCaption: String(formData.get("mediaCaption") || "").trim() || null,
    linkUrl: String(formData.get("linkUrl") || "").trim() || null,
    scheduledAt: intent === "SCHEDULED" ? scheduledAt : null,
    status: (intent === "SCHEDULED" ? "SCHEDULED" : "DRAFT") as SocialPostStatus,
    extrasJson: JSON.stringify({
      hashtags: String(formData.get("hashtags") || "")
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
      author: user.name,
    }),
    lastError: null,
  };

  if (!data.body) {
    redirect("/app/social?err=Testo+obbligatorio");
  }

  if (id) {
    await prisma.socialPost.updateMany({
      where: { id, organizationId: orgId },
      data,
    });
    redirect(`/app/social?saved=1&focus=${id}`);
  }

  const created = await prisma.socialPost.create({
    data: { organizationId: orgId, ...data },
  });
  redirect(`/app/social?saved=1&focus=${created.id}`);
}

export async function publishSocialPostNow(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;
  const id = String(formData.get("id") || "");

  const post = await prisma.socialPost.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!post) redirect("/app/social");

  await prisma.socialPost.update({
    where: { id },
    data: { status: "PUBLISHING", lastError: null },
  });

  const result = await publishSocialSandbox({
    platform: post.platform,
    contentType: post.contentType,
    body: post.body,
    title: post.title,
    mediaUrl: post.mediaUrl,
    linkUrl: post.linkUrl,
    extrasJson: post.extrasJson,
  });

  await prisma.socialPost.update({
    where: { id },
    data: result.ok
      ? {
          status: "PUBLISHED",
          publishedAt: new Date(),
          providerPostId: result.providerPostId || null,
          lastError: result.note || null,
        }
      : {
          status: "FAILED",
          lastError: result.error || "Publish fallito",
        },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      userId: user.id,
      action: result.ok ? "SOCIAL_PUBLISH_SANDBOX" : "SOCIAL_PUBLISH_FAILED",
      entityType: "SocialPost",
      entityId: id,
      metaJson: JSON.stringify(result),
    },
  });

  redirect(result.ok ? `/app/social?published=1&focus=${id}` : `/app/social?err=${encodeURIComponent(result.error || "fail")}&focus=${id}`);
}

export async function cancelSocialPost(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const id = String(formData.get("id") || "");
  await prisma.socialPost.updateMany({
    where: { id, organizationId: membership.organizationId },
    data: { status: "CANCELLED", scheduledAt: null },
  });
  redirect(`/app/social?saved=1&focus=${id}`);
}

export async function deleteSocialPost(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const id = String(formData.get("id") || "");
  await prisma.socialPost.deleteMany({
    where: { id, organizationId: membership.organizationId, status: { in: ["DRAFT", "CANCELLED", "FAILED"] } },
  });
  redirect("/app/social?saved=1");
}

/** Publish all due SCHEDULED posts (sandbox cron substitute). */
export async function runSocialDueQueue(formData?: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;
  const now = new Date();

  const due = await prisma.socialPost.findMany({
    where: {
      organizationId: orgId,
      status: "SCHEDULED",
      scheduledAt: { lte: now },
    },
    take: 50,
  });

  let ok = 0;
  let fail = 0;
  for (const post of due) {
    const result = await publishSocialSandbox({
      platform: post.platform,
      contentType: post.contentType,
      body: post.body,
      title: post.title,
      mediaUrl: post.mediaUrl,
      linkUrl: post.linkUrl,
      extrasJson: post.extrasJson,
    });
    await prisma.socialPost.update({
      where: { id: post.id },
      data: result.ok
        ? {
            status: "PUBLISHED",
            publishedAt: now,
            providerPostId: result.providerPostId || null,
            lastError: result.note || null,
          }
        : { status: "FAILED", lastError: result.error || "fail" },
    });
    if (result.ok) ok += 1;
    else fail += 1;
  }

  const back = formData ? String(formData.get("back") || "/app/social") : "/app/social";
  redirect(`${back}?queue_ok=${ok}&queue_fail=${fail}`);
}
