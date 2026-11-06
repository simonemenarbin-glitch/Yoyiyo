import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BOOTSTRAP_SQL, UPGRADE_ALTERS, UPGRADE_SQL } from "./bootstrap-sql";
import { defaultImapAccounts, loadLocalMailPassword } from "./channels/mail-password";

let bootstrapped = false;
let bootPromise: Promise<void> | null = null;

function sqlStatements(sql: string) {
  return sql
    .split(";")
    .map((chunk) =>
      chunk
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter((stmt) => stmt.length > 0);
}

async function columnExists(prisma: PrismaClient, table: string, column: string) {
  const rows = (await prisma.$queryRawUnsafe(
    `PRAGMA table_info("${table}")`,
  )) as { name: string }[];
  return rows.some((r) => r.name === column);
}

async function tableExists(prisma: PrismaClient, table: string) {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    table,
  )) as { name: string }[];
  return rows.length > 0;
}

async function seedDemoIfEmpty(prisma: PrismaClient) {
  const existing = await prisma.user.findUnique({
    where: { email: "demo@rotta.erp" },
  });
  if (existing) {
    await ensureDemoLeads(prisma, existing.id);
    await ensureDemoBrandHub(prisma, existing.id);
    return;
  }

  const passwordHash = await bcrypt.hash("rotta-demo", 10);
  const org = await prisma.organization.create({
    data: {
      name: "Yoyiyo Demo Network",
      slug: "yoyiyo-demo",
      vatNumber: "IT00000000000",
      brands: {
        create: [
          {
            name: "Yoyiyo",
            slug: "yoyiyo",
            primaryColor: "#B33A2B",
            websiteUrl: "https://yoyiyo.biz",
          },
          {
            name: "Cina in Gruppo",
            slug: "cina-in-gruppo",
            primaryColor: "#0F3D3E",
            websiteUrl: "https://cinaingruppo.it",
          },
        ],
      },
    },
    include: { brands: true },
  });

  const user = await prisma.user.create({
    data: {
      email: "demo@rotta.erp",
      name: "Demo Operatore",
      passwordHash,
      memberships: {
        create: { organizationId: org.id, role: "OWNER" },
      },
    },
  });

  const customer = await prisma.customer.create({
    data: {
      organizationId: org.id,
      firstName: "Laura",
      lastName: "Bianchi",
      email: "laura.bianchi@example.com",
    },
  });

  const partner = await prisma.agencyPartner.create({
    data: {
      organizationId: org.id,
      name: "Be Friend Travel",
      email: "booking@befriend.example",
      commissionPct: 12,
    },
  });

  const hotel = await prisma.catalogProduct.create({
    data: {
      organizationId: org.id,
      type: "HOTEL",
      name: "Holiday Inn Dongzhimen o similare",
      code: "PEK-HID",
      city: "Pechino",
      country: "Cina",
      priceSource: "OWN_LIST",
      ratePlans: {
        create: { name: "BB rimborsabile", netCost: 95, sellPrice: 100 },
      },
    },
  });

  const brand = org.brands.find((b) => b.slug === "yoyiyo")!;
  const practice = await prisma.practice.create({
    data: {
      organizationId: org.id,
      brandId: brand.id,
      customerId: customer.id,
      partnerId: partner.id,
      reference: "PRA-2026-0001",
      title: "Cina Classic 12gg — Bianchi",
      status: "QUOTED",
      channel: "B2B",
      departureDate: new Date("2026-09-10"),
      returnDate: new Date("2026-09-21"),
      paxCount: 2,
      totalSell: 454,
      totalCost: 390,
      marginPct: ((454 - 390) / 454) * 100,
      lines: {
        create: [
          {
            productId: hotel.id,
            serviceType: "HOTEL",
            title: "3 notti Pechino BB",
            quantity: 3,
            netCost: 285,
            sellPrice: 300,
            status: "QUOTED",
          },
        ],
      },
    },
  });

  await prisma.quote.create({
    data: {
      organizationId: org.id,
      brandId: brand.id,
      practiceId: practice.id,
      customerId: customer.id,
      partnerId: partner.id,
      number: "QT-2026-0001",
      title: "Preventivo Cina Classic 12gg",
      status: "SENT",
      channel: "B2B",
      pipelineStage: "NEGOTIATION",
      totalSell: 454,
      totalCost: 390,
      marginPct: ((454 - 390) / 454) * 100,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      hypothesisNote:
        "Ipotesi costruita senza budget. Se sembra troppo alta o troppo basica, ci adeguiamo.",
      notes: "Validità 7 giorni. Prima ipotesi di land.",
      lines: {
        create: [
          {
            productId: hotel.id,
            serviceType: "HOTEL",
            title: "Hotel Pechino 3 notti BB",
            quantity: 3,
            netCost: 95,
            unitPrice: 100,
            priceSource: "OWN_LIST",
          },
        ],
      },
    },
  });

  await ensureDemoLeads(prisma, user.id, org.id, brand.id);
  await ensureDemoBrandHub(prisma, user.id, org.id);
}

async function ensureDemoBrandHub(
  prisma: PrismaClient,
  userId: string,
  orgId?: string,
) {
  if (!(await tableExists(prisma, "Campaign")) || !(await tableExists(prisma, "BrandSite"))) {
    return;
  }

  const org =
    orgId ||
    (
      await prisma.membership.findFirst({
        where: { userId },
        select: { organizationId: true },
      })
    )?.organizationId;
  if (!org) return;

  const yoyiyo = await prisma.brand.findFirst({
    where: { organizationId: org, slug: "yoyiyo" },
  });
  const cig = await prisma.brand.findFirst({
    where: { organizationId: org, slug: "cina-in-gruppo" },
  });
  if (!yoyiyo) return;

  // Enrich brand identity if still bare
  if (!yoyiyo.tagline) {
    await prisma.brand.update({
      where: { id: yoyiyo.id },
      data: {
        tagline: "Cina su misura — ipotesi chiuse, non listino fisso",
        secondaryColor: yoyiyo.secondaryColor || "#0F3D3E",
        domain: yoyiyo.domain || "yoyiyo.biz",
        seoTitle: yoyiyo.seoTitle || "Yoyiyo — Tour operator Cina",
        seoDescription:
          yoyiyo.seoDescription ||
          "Preventivi FIT e groupage Cina con ufficio booking italiano e backoffice in Cina.",
        socialJson:
          yoyiyo.socialJson ||
          JSON.stringify({ instagram: "@yoyiyo", facebook: "yoyiyo", whatsapp: "+39" }),
      },
    });
  }
  if (cig && !cig.tagline) {
    await prisma.brand.update({
      where: { id: cig.id },
      data: {
        tagline: "Partenze garantite e groupage Cina",
        secondaryColor: cig.secondaryColor || "#B33A2B",
        domain: cig.domain || "cinaingruppo.it",
        seoTitle: cig.seoTitle || "Cina in Gruppo",
        seoDescription:
          cig.seoDescription || "Circuiti e groupage Cina con partenza garantita.",
      },
    });
  }

  let campaign = await prisma.campaign.findFirst({
    where: { organizationId: org, brandId: yoyiyo.id },
  });
  if (!campaign) {
    campaign = await prisma.campaign.create({
      data: {
        organizationId: org,
        brandId: yoyiyo.id,
        name: "Meta Ads — Cina Classic primavera",
        channel: "ADS",
        status: "LIVE",
        goal: "Lead B2C FIT Pechino–Shanghai",
        utmCampaign: "cina-classic-spring",
        utmSource: "meta",
        utmMedium: "cpc",
        budget: 2500,
        spend: 980,
        impressions: 42000,
        clicks: 1100,
        startAt: new Date("2026-02-01"),
      },
    });
  }

  if (cig) {
    const cigCampaign = await prisma.campaign.findFirst({
      where: { organizationId: org, brandId: cig.id },
    });
    if (!cigCampaign) {
      await prisma.campaign.create({
        data: {
          organizationId: org,
          brandId: cig.id,
          name: "Newsletter B2B groupage marzo",
          channel: "EMAIL",
          status: "SCHEDULED",
          goal: "Richieste groupage >20 pax",
          utmCampaign: "groupage-marzo",
          utmSource: "newsletter",
          utmMedium: "email",
        },
      });
    }
  }

  const landing = await prisma.brandSite.findFirst({
    where: { brandId: yoyiyo.id, slug: "cina-classic" },
  });
  if (!landing) {
    await prisma.brandSite.create({
      data: {
        organizationId: org,
        brandId: yoyiyo.id,
        campaignId: campaign.id,
        name: "Landing Cina Classic",
        slug: "cina-classic",
        pageType: "LANDING",
        status: "PUBLISHED",
        title: "Cina Classic — ipotesi su misura",
        subtitle:
          "Pechino, Xi’an, Shanghai. Prima idea di partenza, non un programma chiuso.",
        ctaLabel: "Richiedi preventivo",
        publishedAt: new Date(),
        views: 12,
        formSubmits: 0,
        blocksJson: JSON.stringify([
          {
            type: "hero",
            title: "Viaggia in Cina con Yoyiyo",
            subtitle: "Ipotesi di land su misura — non un programma chiuso.",
            ctaLabel: "Richiedi preventivo",
          },
          {
            type: "features",
            items: [
              {
                title: "Listino proprio + API",
                text: "Quote chiuse, hotel e servizi aggiornabili.",
              },
              {
                title: "Assistenza IT",
                text: "Ufficio booking italiano e backoffice in Cina.",
              },
              {
                title: "WeChat 24h",
                text: "Assistenza sugli imprevisti del viaggio organizzato.",
              },
            ],
          },
          {
            type: "itinerary",
            days: [
              { title: "Pechino", text: "Città Proibita, Muraglia, guida in italiano." },
              { title: "Xi’an", text: "Esercito di terracotta, guida in italiano." },
              {
                title: "Shanghai",
                text: "Bund e quartieri contemporanei con accompagnatore IT.",
              },
            ],
          },
          {
            type: "form",
            title: "Raccontaci cosa cercate",
            fields: ["nome", "email", "pax", "periodo", "messaggio"],
          },
          {
            type: "trust",
            items: [
              "Validità preventivo 7 giorni",
              "Ipotesi senza budget, ricalibrabile",
              "Multi-brand Yoyiyo",
            ],
          },
        ]),
      },
    });
  }

  if (cig) {
    const home = await prisma.brandSite.findFirst({
      where: { brandId: cig.id, slug: "home" },
    });
    if (!home) {
      await prisma.brandSite.create({
        data: {
          organizationId: org,
          brandId: cig.id,
          name: "Home Cina in Gruppo",
          slug: "home",
          pageType: "HOME",
          status: "DRAFT",
          title: "Partenze e groupage Cina",
          subtitle:
            "Circuiti e gruppi oltre 20 pax con acconto 10% e release 120 giorni.",
          ctaLabel: "Chiedi una data",
          blocksJson: JSON.stringify([
            {
              type: "hero",
              title: "Cina in Gruppo",
              subtitle: "Partenze garantite e groupage con ufficio booking italiano.",
              ctaLabel: "Chiedi una data",
            },
            {
              type: "form",
              title: "Richiesta groupage",
              fields: ["nome", "email", "pax", "periodo", "messaggio"],
            },
          ]),
        },
      });
    }
  }
}

async function ensureDemoLeads(
  prisma: PrismaClient,
  userId: string,
  orgId?: string,
  brandId?: string,
) {
  const org =
    orgId ||
    (
      await prisma.membership.findFirst({
        where: { userId },
        select: { organizationId: true },
      })
    )?.organizationId;
  if (!org) return;

  const count = await prisma.lead.count({ where: { organizationId: org } });
  if (count > 0) return;

  const brand =
    brandId ||
    (
      await prisma.brand.findFirst({
        where: { organizationId: org, slug: "yoyiyo" },
      })
    )?.id;

  await prisma.lead.createMany({
    data: [
      {
        organizationId: org,
        brandId: brand,
        assigneeUserId: userId,
        firstName: "Marco",
        lastName: "Rossi",
        email: "marco.rossi@example.com",
        phone: "+39 340 1112233",
        source: "WHATSAPP",
        sourceDetail: "wa.me inbound",
        pipelineStage: "NEW",
        interest: "Cina 10–12 giorni, Pechino Shanghai",
        paxCount: 2,
        notes: "Lead WhatsApp — chiede ipotesi land senza voli.",
      },
      {
        organizationId: org,
        brandId: brand,
        assigneeUserId: userId,
        firstName: "Giulia",
        lastName: "Verdi",
        email: "giulia.verdi@example.com",
        source: "INSTAGRAM",
        sourceDetail: "DM @yoyiyo",
        pipelineStage: "CONTACTED",
        interest: "Zhangjiajie + Chengdu, 8 pax amici",
        paxCount: 8,
        budgetHint: 1800,
      },
      {
        organizationId: org,
        brandId: brand,
        assigneeUserId: userId,
        firstName: "Agenzia",
        lastName: "Nord Est",
        email: "richieste@nordest.example",
        phone: "+39 041 000000",
        source: "EMAIL",
        sourceDetail: "info@ inbound",
        pipelineStage: "QUALIFIED",
        interest: "Groupage 24 pax Guilin Yangshuo",
        paxCount: 24,
        notes: "B2B mail — oltre 20 pax: acconto 10% / release 120gg.",
      },
    ],
  });
}

async function upgradeSchema(prisma: PrismaClient) {
  for (const stmt of UPGRADE_SQL) {
    try {
      await prisma.$executeRawUnsafe(stmt);
    } catch (err) {
      console.warn("[rotta] upgrade sql skipped", err);
    }
  }

  for (const alter of UPGRADE_ALTERS) {
    try {
      if (!(await tableExists(prisma, alter.table))) continue;
      if (await columnExists(prisma, alter.table, alter.column)) continue;
      await prisma.$executeRawUnsafe(alter.sql);
    } catch (err) {
      console.warn(`[rotta] alter ${alter.table}.${alter.column} skipped`, err);
    }
  }
}

async function bootstrapOnce() {
  const prisma = new PrismaClient();
  try {
    const hasUser = await tableExists(prisma, "User");
    if (!hasUser) {
      for (const stmt of sqlStatements(BOOTSTRAP_SQL)) {
        await prisma.$executeRawUnsafe(stmt);
      }
      await seedDemoIfEmpty(prisma);
      bootstrapped = true;
      console.log("[rotta] database bootstrapped (fresh)");
      return;
    }

    await upgradeSchema(prisma);
    await seedDemoIfEmpty(prisma);
    await ensureDefaultChannels(prisma);
    bootstrapped = true;
    console.log("[rotta] database ready (upgrade checked)");
  } finally {
    await prisma.$disconnect();
  }
}

async function ensureDefaultChannels(prisma: PrismaClient) {
  const org = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (!org) return;
  if (!(await tableExists(prisma, "ChannelConnection"))) return;

  const password = loadLocalMailPassword();
  for (const acc of defaultImapAccounts()) {
    const existing = await prisma.channelConnection.findFirst({
      where: { organizationId: org.id, label: acc.label },
    });
    if (existing) {
      if (password && !existing.secret) {
        await prisma.channelConnection.update({
          where: { id: existing.id },
          data: { secret: password, enabled: true, host: existing.host || "imap.hostinger.com", port: existing.port || 993 },
        });
      }
      continue;
    }
    await prisma.channelConnection.create({
      data: {
        organizationId: org.id,
        label: acc.label,
        source: "EMAIL",
        kind: "IMAP",
        enabled: Boolean(password),
        host: "imap.hostinger.com",
        port: 993,
        username: acc.username,
        secret: password,
        mailbox: "INBOX",
        lookbackDays: 3,
      },
    });
  }

  for (const p of [
    { label: "WhatsApp Business", kind: "WHATSAPP_CLOUD" as const, source: "WHATSAPP" as const },
    { label: "Instagram DM", kind: "META_INSTAGRAM" as const, source: "INSTAGRAM" as const },
    { label: "Facebook Page", kind: "META_FACEBOOK" as const, source: "FACEBOOK" as const },
    { label: "Form sito / landing", kind: "WEB_FORM" as const, source: "WEB" as const },
  ]) {
    const exists = await prisma.channelConnection.findFirst({
      where: { organizationId: org.id, label: p.label },
    });
    if (exists) continue;
    await prisma.channelConnection.create({
      data: {
        organizationId: org.id,
        label: p.label,
        source: p.source,
        kind: p.kind,
        enabled: false,
        configJson: JSON.stringify({ pending: [] }),
      },
    });
  }
}

export async function ensureDatabase() {
  if (bootstrapped) return;
  if (!bootPromise) {
    bootPromise = bootstrapOnce().catch((err) => {
      bootPromise = null;
      console.error("[rotta] database bootstrap failed", err);
      throw err;
    });
  }
  await bootPromise;
}
