"use server";

import { redirect } from "next/navigation";
import type { AudienceListKind, CampaignChannel, CampaignStatus } from "@prisma/client";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildAudienceFromLeads, parseAudiencePrompt } from "@/lib/growth/ai-lists";
import { runSeoChecklist } from "@/lib/growth/seo-checklist";

export async function upsertAdsCampaign(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;
  const id = String(formData.get("id") || "");
  const brandId = String(formData.get("brandId") || "");

  const brand = await prisma.brand.findFirst({ where: { id: brandId, organizationId: orgId } });
  if (!brand) redirect("/app/growth");

  const extras = {
    platform: String(formData.get("adPlatform") || "meta"),
    objective: String(formData.get("objective") || "leads"),
    audienceListId: String(formData.get("audienceListId") || "") || null,
    dailyBudget: Number(formData.get("dailyBudget") || 0) || 0,
    notes: String(formData.get("adNotes") || "") || null,
  };

  const data = {
    name: String(formData.get("name") || "").trim() || "Campagna ads",
    channel: (String(formData.get("channel") || "ADS") as CampaignChannel) || "ADS",
    status: (String(formData.get("status") || "DRAFT") as CampaignStatus) || "DRAFT",
    goal: String(formData.get("goal") || "") || null,
    utmCampaign: String(formData.get("utmCampaign") || "") || null,
    utmSource: String(formData.get("utmSource") || "ads") || null,
    utmMedium: String(formData.get("utmMedium") || "cpc") || null,
    budget: Number(formData.get("budget") || 0) || 0,
    spend: Number(formData.get("spend") || 0) || 0,
    impressions: Number(formData.get("impressions") || 0) || 0,
    clicks: Number(formData.get("clicks") || 0) || 0,
    notes: String(formData.get("notes") || "") || null,
    extrasJson: JSON.stringify(extras),
  };

  if (id) {
    await prisma.campaign.updateMany({
      where: { id, organizationId: orgId },
      data,
    });
  } else {
    await prisma.campaign.create({
      data: { organizationId: orgId, brandId, ...data },
    });
  }
  redirect("/app/growth?saved=1#ads");
}

export async function buildAiAudienceList(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;

  const prompt = String(formData.get("prompt") || "").trim();
  const brandId = String(formData.get("brandId") || "") || null;
  const campaignId = String(formData.get("campaignId") || "") || null;
  const name = String(formData.get("name") || "").trim() || prompt.slice(0, 60) || "Lista AI";

  if (!prompt) redirect("/app/growth?err=Prompt+mancante#liste");

  const criteria = parseAudiencePrompt(prompt);
  if (brandId) criteria.brandId = brandId;

  const leads = await prisma.lead.findMany({
    where: {
      organizationId: orgId,
      ...(brandId ? { brandId } : {}),
    },
  });
  const { members } = buildAudienceFromLeads(leads, criteria);

  const kind: AudienceListKind =
    /lookalike|simile/.test(prompt.toLowerCase()) ? "LOOKALIKE_STUB" : "AI_SEGMENT";

  const list = await prisma.audienceList.create({
    data: {
      organizationId: orgId,
      brandId,
      campaignId,
      name,
      kind,
      description: `Generata da prompt: ${prompt}`,
      criteriaJson: JSON.stringify(criteria),
      memberCount: members.length,
      membersJson: JSON.stringify(members.slice(0, 500)),
      lastBuiltAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      userId: user.id,
      action: "AI_LIST_BUILT",
      entityType: "AudienceList",
      entityId: list.id,
      metaJson: JSON.stringify({ prompt, memberCount: members.length, criteria }),
    },
  });

  redirect(`/app/growth?list=${list.id}&members=${members.length}#liste`);
}

export async function rebuildAudienceList(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;
  const id = String(formData.get("id") || "");

  const list = await prisma.audienceList.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!list) redirect("/app/growth#liste");

  let criteria = list.criteriaJson ? JSON.parse(list.criteriaJson) : {};
  if (list.description?.startsWith("Generata da prompt:") && (!criteria.prompt || !Object.keys(criteria).length)) {
    const prompt = list.description.replace(/^Generata da prompt:\s*/, "");
    criteria = parseAudiencePrompt(prompt);
  }
  if (list.brandId) criteria.brandId = list.brandId;

  const leads = await prisma.lead.findMany({
    where: {
      organizationId: orgId,
      ...(list.brandId ? { brandId: list.brandId } : {}),
    },
  });
  const { members } = buildAudienceFromLeads(leads, criteria);

  await prisma.audienceList.update({
    where: { id },
    data: {
      memberCount: members.length,
      membersJson: JSON.stringify(members.slice(0, 500)),
      criteriaJson: JSON.stringify(criteria),
      lastBuiltAt: new Date(),
    },
  });
  redirect(`/app/growth?list=${id}&members=${members.length}#liste`);
}

export async function refreshSeoSnapshots(formData?: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;

  const sites = await prisma.brandSite.findMany({
    where: { organizationId: orgId },
    include: { brand: true, campaign: true },
  });

  let updated = 0;
  for (const site of sites) {
    const { score, checks } = runSeoChecklist({
      brand: site.brand,
      site,
      campaignUtm: site.campaign?.utmCampaign,
    });
    if (site.campaignId) {
      const campaign = await prisma.campaign.findFirst({
        where: { id: site.campaignId, organizationId: orgId },
      });
      if (campaign) {
        let extras: Record<string, unknown> = {};
        try {
          extras = campaign.extrasJson ? JSON.parse(campaign.extrasJson) : {};
        } catch {
          extras = {};
        }
        extras.seo = { siteId: site.id, score, checks, at: new Date().toISOString() };
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { extrasJson: JSON.stringify(extras) },
        });
        updated += 1;
      }
    }
  }

  const back = formData ? String(formData.get("back") || "/app/growth") : "/app/growth";
  redirect(`${back}?seo=${updated}#seo`);
}
