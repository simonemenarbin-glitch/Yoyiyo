import {
  PrismaClient,
  ProductType,
  type LeadSource,
  type PipelineStage,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.conversationMessage.deleteMany();
  await prisma.inboxThread.deleteMany();
  await prisma.ingestedMessage.deleteMany();
  await prisma.channelConnection.deleteMany();
  await prisma.quoteLine.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.practiceLine.deleteMany();
  await prisma.practice.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.socialPost.deleteMany();
  await prisma.audienceList.deleteMany();
  await prisma.brandSite.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.ratePlan.deleteMany();
  await prisma.catalogProduct.deleteMany();
  await prisma.agencyPartner.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.session.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

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
            status: "ACTIVE",
            tagline: "Cina su misura — ipotesi chiuse, non listino fisso",
            primaryColor: "#B33A2B",
            secondaryColor: "#0F3D3E",
            domain: "yoyiyo.biz",
            websiteUrl: "https://yoyiyo.biz",
            seoTitle: "Yoyiyo — Tour operator Cina",
            seoDescription:
              "Preventivi FIT e groupage Cina con ufficio booking italiano e backoffice in Cina.",
            socialJson: JSON.stringify({
              instagram: "@yoyiyo",
              facebook: "yoyiyo",
              whatsapp: "+39",
            }),
          },
          {
            name: "Cina in Gruppo",
            slug: "cina-in-gruppo",
            status: "ACTIVE",
            tagline: "Partenze garantite e groupage Cina",
            primaryColor: "#0F3D3E",
            secondaryColor: "#B33A2B",
            domain: "cinaingruppo.it",
            websiteUrl: "https://cinaingruppo.it",
            seoTitle: "Cina in Gruppo",
            seoDescription: "Circuiti e groupage Cina con partenza garantita.",
            socialJson: JSON.stringify({
              instagram: "@cinaingruppo",
              facebook: "cinaingruppo",
              whatsapp: "",
            }),
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
        create: {
          organizationId: org.id,
          role: "OWNER",
        },
      },
    },
  });

  const yoyiyoBrand = org.brands.find((b) => b.slug === "yoyiyo")!;

  const customer = await prisma.customer.create({
    data: {
      organizationId: org.id,
      firstName: "Laura",
      lastName: "Bianchi",
      email: "laura.bianchi@example.com",
      phone: "+39 333 0000000",
      clientType: "B2C",
      preferredBrandId: yoyiyoBrand.id,
    },
  });

  const customerGroup = await prisma.customer.create({
    data: {
      organizationId: org.id,
      firstName: "Comitato",
      lastName: "Viaggi Nord",
      email: "comitato@nord.example",
      clientType: "GROUP",
      preferredBrandId: org.brands.find((b) => b.slug === "cina-in-gruppo")!.id,
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
      type: ProductType.HOTEL,
      name: "Holiday Inn Dongzhimen o similare",
      code: "PEK-HID",
      city: "Pechino",
      country: "Cina",
      description: "4★ BB rimborsabile",
      priceSource: "OWN_LIST",
      ratePlans: {
        create: {
          name: "BB rimborsabile",
          netCost: 95,
          sellPrice: 100,
          cancellationPolicy: "Free cancellation 7 giorni",
        },
      },
    },
  });

  const train = await prisma.catalogProduct.create({
    data: {
      organizationId: org.id,
      type: ProductType.OTHER,
      name: "Treno AV Pechino → Shanghai",
      code: "HSR-PEK-SHA",
      city: "Pechino",
      country: "Cina",
      description: "2a classe, circa 5 ore",
      priceSource: "OWN_LIST",
      ratePlans: {
        create: {
          name: "2a classe",
          netCost: 70,
          sellPrice: 84,
        },
      },
    },
  });

  const guide = await prisma.catalogProduct.create({
    data: {
      organizationId: org.id,
      type: ProductType.EXCURSION,
      name: "Guida in italiano Pechino (full day 8h)",
      code: "PEK-GUIDE-IT",
      city: "Pechino",
      country: "Cina",
      priceSource: "OWN_LIST",
      ratePlans: {
        create: {
          name: "Giornata intera",
          netCost: 180,
          sellPrice: 216,
        },
      },
    },
  });

  const transfer = await prisma.catalogProduct.create({
    data: {
      organizationId: org.id,
      type: ProductType.TRANSFER,
      name: "Transfer aeroporto Pechino",
      code: "PEK-TRF",
      city: "Pechino",
      country: "Cina",
      priceSource: "OWN_LIST",
      ratePlans: {
        create: {
          name: "Private sedan",
          netCost: 45,
          sellPrice: 54,
        },
      },
    },
  });

  // Placeholder prodotto API-ready (non ancora collegato a un fornitore live)
  await prisma.catalogProduct.create({
    data: {
      organizationId: org.id,
      type: ProductType.HOTEL,
      name: "Hotel via API fornitore (slot)",
      code: "API-HOTEL-SLOT",
      city: "Shanghai",
      country: "Cina",
      description: "Struttura pronta per SUPPLIER_API — integrazione successiva",
      priceSource: "SUPPLIER_API",
      supplierCode: "FUTURE_DMC",
      supplierRef: "pending",
      active: false,
      ratePlans: {
        create: {
          name: "Placeholder",
          netCost: 0,
          sellPrice: 0,
        },
      },
    },
  });

  const brand = yoyiyoBrand;

  const leadDefs: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    source: LeadSource;
    sourceDetail?: string;
    pipelineStage: PipelineStage;
    interest: string;
    paxCount: number;
    budgetHint?: number;
    notes?: string;
    intakeStatus?: "RAW" | "PARSED" | "READY_TO_QUOTE" | "QUOTED" | "NEEDS_INFO";
    departureHint?: string;
    durationDays?: number;
    destinationsJson?: string;
    rawSourceText?: string;
    missingFieldsJson?: string;
    draftReply?: string;
  }[] = [
    {
      firstName: "Marco",
      lastName: "Rossi",
      email: "marco.rossi@example.com",
      phone: "+39 340 1112233",
      source: "WHATSAPP",
      sourceDetail: "wa.me inbound",
      pipelineStage: "NEW",
      intakeStatus: "NEEDS_INFO",
      interest: "Cina, Pechino Shanghai",
      paxCount: 2,
      destinationsJson: JSON.stringify(["Pechino", "Shanghai"]),
      rawSourceText:
        "Ciao, vorremmo qualcosa in Cina con Pechino e Shanghai, siamo in 2. Mandatemi info. Marco Rossi +39 340 1112233",
      missingFieldsJson: JSON.stringify(["dates", "duration"]),
      draftReply:
        "Buongiorno Marco Rossi,\n\ngrazie per il messaggio WhatsApp.\nDa quello che leggiamo oggi risulta: destinazioni Pechino, Shanghai; 2 persone.\n\nPer prepararvi un preventivo base ci servono:\n• periodo o data di partenza indicativa\n• durata del viaggio in giorni\n\nAppena ci mandate questi punti vi restituiamo un’ipotesi di lavoro chiusa nei numeri.\n\nUfficio Booking / Yoyiyo",
      notes: "Intake WhatsApp — mancano date/durata.",
    },
    {
      firstName: "Giulia",
      lastName: "Verdi",
      email: "giulia.verdi@example.com",
      source: "INSTAGRAM",
      sourceDetail: "DM @yoyiyo",
      pipelineStage: "CONTACTED",
      intakeStatus: "READY_TO_QUOTE",
      interest: "Zhangjiajie → Chengdu · 8 pax · 10 giorni",
      paxCount: 8,
      budgetHint: 1800,
      durationDays: 10,
      departureHint: "ottobre 2026",
      destinationsJson: JSON.stringify(["Zhangjiajie", "Chengdu"]),
      rawSourceText:
        "Ciao! Siamo 8 amici, vorremmo Zhangjiajie e Chengdu per 10 giorni a ottobre 2026, budget circa 1800. Giulia Verdi giulia.verdi@example.com",
      missingFieldsJson: JSON.stringify([]),
    },
    {
      firstName: "Agenzia",
      lastName: "Nord Est",
      email: "richieste@nordest.example",
      phone: "+39 041 000000",
      source: "EMAIL",
      sourceDetail: "info@ inbound",
      pipelineStage: "QUALIFIED",
      intakeStatus: "READY_TO_QUOTE",
      interest: "Guilin → Yangshuo · 24 pax · 8 giorni",
      paxCount: 24,
      durationDays: 8,
      departureHint: "marzo 2027",
      destinationsJson: JSON.stringify(["Guilin", "Yangshuo"]),
      rawSourceText:
        "Buongiorno, groupage 24 pax Guilin Yangshuo 8 giorni marzo 2027. Richieste Nord Est richieste@nordest.example +39 041 000000",
      missingFieldsJson: JSON.stringify([]),
      notes: "B2B mail — oltre 20 pax: acconto 10% / release 120gg.",
    },
  ];

  for (const def of leadDefs) {
    const isGroup = (def.paxCount || 0) > 20;
    await prisma.lead.create({
      data: {
        organizationId: org.id,
        brandId: isGroup
          ? org.brands.find((b) => b.slug === "cina-in-gruppo")!.id
          : brand.id,
        assigneeUserId: user.id,
        clientType: isGroup ? "GROUP" : def.source === "EMAIL" && def.paxCount === 24 ? "B2B" : "B2C",
        pipelineName: def.interest,
        partnerId: isGroup ? partner.id : null,
        customerId: isGroup ? customerGroup.id : null,
        ...def,
      },
    });
  }

  const quotingLead = await prisma.lead.create({
    data: {
      organizationId: org.id,
      brandId: brand.id,
      customerId: customer.id,
      partnerId: partner.id,
      assigneeUserId: user.id,
      firstName: "Laura",
      lastName: "Bianchi",
      email: customer.email,
      phone: customer.phone,
      clientType: "B2B",
      pipelineName: "Cina Classic 12gg",
      source: "EMAIL",
      sourceDetail: "agenzia Be Friend",
      pipelineStage: "QUOTING",
      interest: "Cina Classic 12gg",
      paxCount: 2,
    },
  });

  // Seconda pipeline sullo stesso cliente B2C/B2B Bianchi
  await prisma.lead.create({
    data: {
      organizationId: org.id,
      brandId: org.brands.find((b) => b.slug === "cina-in-gruppo")!.id,
      customerId: customer.id,
      assigneeUserId: user.id,
      firstName: "Laura",
      lastName: "Bianchi",
      email: customer.email,
      phone: customer.phone,
      clientType: "B2C",
      pipelineName: "Estensione Yunnan 2027",
      source: "WHATSAPP",
      sourceDetail: "follow-up cliente",
      pipelineStage: "CONTACTED",
      interest: "Yunnan 8 giorni",
      paxCount: 2,
    },
  });

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
      notes: "Ipotesi senza budget — nucleo demo Rotta",
      lines: {
        create: [
          {
            productId: hotel.id,
            serviceType: ProductType.HOTEL,
            title: "3 notti Pechino BB",
            quantity: 3,
            netCost: 285,
            sellPrice: 300,
            status: "QUOTED",
          },
          {
            productId: train.id,
            serviceType: ProductType.OTHER,
            title: "Treno AV Pechino → Shanghai x2",
            quantity: 2,
            netCost: 140,
            sellPrice: 168,
            status: "QUOTED",
          },
          {
            productId: guide.id,
            serviceType: ProductType.EXCURSION,
            title: "Guida IT Pechino 1 giornata",
            quantity: 1,
            netCost: 180,
            sellPrice: 216,
            status: "QUOTED",
          },
          {
            productId: transfer.id,
            serviceType: ProductType.TRANSFER,
            title: "Transfer arrivo Pechino",
            quantity: 1,
            netCost: 45,
            sellPrice: 54,
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
      leadId: quotingLead.id,
      number: "QT-2026-0001",
      title: "Preventivo Cina Classic 12gg",
      status: "SENT",
      channel: "B2B",
      pipelineStage: "NEGOTIATION",
      paxCount: 2,
      departureDate: new Date("2026-09-10"),
      returnDate: new Date("2026-09-21"),
      totalSell: 738,
      totalCost: 650,
      marginPct: ((738 - 650) / 738) * 100,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      hypothesisNote:
        "Questa è un’ipotesi che costruiamo senza avere un budget. Se sembra troppo alta o troppo basica, ci adeguiamo.",
      notes: "Validità 7 giorni. Prima ipotesi di land — non programma chiuso.",
      lines: {
        create: [
          {
            productId: hotel.id,
            serviceType: ProductType.HOTEL,
            title: "Hotel Pechino 3 notti BB",
            quantity: 3,
            netCost: 95,
            unitPrice: 100,
            priceSource: "OWN_LIST",
          },
          {
            productId: train.id,
            serviceType: ProductType.OTHER,
            title: "Treno AV PEK-SHA",
            quantity: 2,
            netCost: 70,
            unitPrice: 84,
            priceSource: "OWN_LIST",
          },
          {
            productId: guide.id,
            serviceType: ProductType.EXCURSION,
            title: "Guida IT Pechino",
            quantity: 1,
            netCost: 180,
            unitPrice: 216,
            priceSource: "OWN_LIST",
          },
          {
            productId: transfer.id,
            serviceType: ProductType.TRANSFER,
            title: "Transfer aeroporto",
            quantity: 1,
            netCost: 45,
            unitPrice: 54,
            priceSource: "OWN_LIST",
          },
        ],
      },
    },
  });

  // Channel connections (IMAP password from env / mail-config.php if present)
  let imapPass: string | null = process.env.ROTTA_IMAP_PASSWORD || process.env.IMAP_PASSWORD || null;
  try {
    const fs = await import("fs");
    const cfg = "/Users/simonemenarbin/cloud-cina-b2b/data/mail-config.php";
    if (!imapPass && fs.existsSync(cfg)) {
      const m = fs.readFileSync(cfg, "utf8").match(/'pass'\s*=>\s*'([^']+)'/);
      imapPass = m?.[1] || null;
    }
  } catch {
    imapPass = null;
  }

  for (const acc of [
    "booking@yoyiyo.it",
    "info@yoyiyo.it",
    "simone@yoyiyo.it",
  ]) {
    await prisma.channelConnection.create({
      data: {
        organizationId: org.id,
        label: acc,
        source: "EMAIL",
        kind: "IMAP",
        enabled: Boolean(imapPass),
        host: "imap.hostinger.com",
        port: 993,
        username: acc,
        secret: imapPass,
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

  const cigBrand = org.brands.find((b) => b.slug === "cina-in-gruppo")!;

  const yoyiyoCampaign = await prisma.campaign.create({
    data: {
      organizationId: org.id,
      brandId: yoyiyoBrand.id,
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
      leadsCount: 0,
      startAt: new Date("2026-02-01"),
      notes: "Creatività Muraglia + CTA preventivo",
    },
  });

  await prisma.campaign.create({
    data: {
      organizationId: org.id,
      brandId: cigBrand.id,
      name: "Newsletter B2B groupage marzo",
      channel: "EMAIL",
      status: "SCHEDULED",
      goal: "Richieste groupage >20 pax",
      utmCampaign: "groupage-marzo",
      utmSource: "newsletter",
      utmMedium: "email",
      budget: 0,
      spend: 0,
    },
  });

  // Prefer shared template builders so seed stays aligned with the landing hub.
  const { applyLandingTemplate } = await import("../src/lib/brand/templates");
  const fitTpl = applyLandingTemplate("fit-cina", "Yoyiyo")!;
  const groupTpl = applyLandingTemplate("groupage", "Cina in Gruppo")!;
  const partnerTpl = applyLandingTemplate("partner-b2b", "Yoyiyo")!;

  await prisma.brandSite.create({
    data: {
      organizationId: org.id,
      brandId: yoyiyoBrand.id,
      campaignId: yoyiyoCampaign.id,
      name: "Landing Cina Classic",
      slug: "cina-classic",
      pageType: "LANDING",
      status: "PUBLISHED",
      title: "Cina Classic — ipotesi su misura",
      subtitle: "Pechino, Xi’an, Shanghai. Prima idea di partenza, non un programma chiuso.",
      ctaLabel: fitTpl.ctaLabel,
      blocksJson: JSON.stringify(fitTpl.blocks),
      publishedAt: new Date(),
      views: 128,
      formSubmits: 7,
    },
  });

  await prisma.brandSite.create({
    data: {
      organizationId: org.id,
      brandId: yoyiyoBrand.id,
      campaignId: yoyiyoCampaign.id,
      name: "Partner B2B (template)",
      slug: "partner",
      pageType: partnerTpl.pageType,
      status: "PUBLISHED",
      title: "Partnership Yoyiyo",
      subtitle: "Net e promoter per agenzie.",
      ctaLabel: partnerTpl.ctaLabel,
      blocksJson: JSON.stringify(partnerTpl.blocks),
      publishedAt: new Date(),
      views: 42,
      formSubmits: 3,
    },
  });

  await prisma.brandSite.create({
    data: {
      organizationId: org.id,
      brandId: cigBrand.id,
      name: "Home Cina in Gruppo",
      slug: "home",
      pageType: "HOME",
      status: "PUBLISHED",
      title: "Partenze e groupage Cina",
      subtitle: "Circuiti e gruppi oltre 20 pax con acconto 10% e release 120 giorni.",
      ctaLabel: groupTpl.ctaLabel,
      blocksJson: JSON.stringify(groupTpl.blocks),
      publishedAt: new Date(),
      views: 64,
      formSubmits: 5,
    },
  });

  await prisma.lead.updateMany({
    where: {
      organizationId: org.id,
      brandId: yoyiyoBrand.id,
      source: "INSTAGRAM",
    },
    data: { campaignId: yoyiyoCampaign.id },
  });

  await prisma.campaign.update({
    where: { id: yoyiyoCampaign.id },
    data: { leadsCount: 1, revenueAttributed: 0 },
  });

  const { syncSandboxInbox } = await import("../src/lib/inbox/sandbox-sync");
  const inboxSync = await syncSandboxInbox(prisma, org.id);

  const inTwoHours = new Date(Date.now() + 2 * 3600_000);
  const tomorrow = new Date(Date.now() + 26 * 3600_000);
  await prisma.socialPost.createMany({
    data: [
      {
        organizationId: org.id,
        brandId: yoyiyoBrand.id,
        campaignId: yoyiyoCampaign.id,
        platform: "META_INSTAGRAM",
        contentType: "POST",
        status: "SCHEDULED",
        title: "IG · Cina Classic",
        body: "Ipotesi di land su misura — non un programma chiuso. Link in bio.",
        linkUrl: "/s/yoyiyo/cina-classic",
        scheduledAt: inTwoHours,
        extrasJson: JSON.stringify({ hashtags: ["#cina", "#yoyiyo"] }),
      },
      {
        organizationId: org.id,
        brandId: yoyiyoBrand.id,
        platform: "META_INSTAGRAM",
        contentType: "STORY",
        status: "DRAFT",
        title: "Story teaser Muraglia",
        body: "Pechino → Muraglia. Story sandbox.",
        mediaCaption: "Muraglia",
      },
      {
        organizationId: org.id,
        brandId: cigBrand.id,
        platform: "TIKTOK",
        contentType: "POST",
        status: "SCHEDULED",
        title: "TikTok groupage",
        body: "Groupage Cina >20 pax · acconto 10% · release 120 giorni.",
        linkUrl: "/s/cina-in-gruppo/home",
        scheduledAt: tomorrow,
      },
      {
        organizationId: org.id,
        brandId: yoyiyoBrand.id,
        platform: "LINKEDIN",
        contentType: "POST",
        status: "DRAFT",
        title: "LinkedIn B2B partner",
        body: "Agenzie: net e promoter sul portale Yoyiyo.",
        linkUrl: "/s/yoyiyo/partner",
      },
      {
        organizationId: org.id,
        brandId: yoyiyoBrand.id,
        platform: "META_FACEBOOK",
        contentType: "STORY",
        status: "PUBLISHED",
        title: "FB Story demo",
        body: "Story Facebook già pubblicata (sandbox).",
        publishedAt: new Date(Date.now() - 3600_000),
        providerPostId: "sandbox-fb-story-seed",
        lastError: "Sandbox META_FACEBOOK story: nessun token live usato.",
      },
    ],
  });

  const { parseAudiencePrompt, buildAudienceFromLeads } = await import(
    "../src/lib/growth/ai-lists"
  );
  const adsCampaign = await prisma.campaign.create({
    data: {
      organizationId: org.id,
      brandId: yoyiyoBrand.id,
      name: "Meta leads Cina Classic (stub)",
      channel: "ADS",
      status: "LIVE",
      goal: "Lead FIT da landing",
      utmCampaign: "cina-classic-meta",
      utmSource: "ads",
      utmMedium: "cpc",
      budget: 800,
      spend: 120,
      impressions: 14000,
      clicks: 310,
      extrasJson: JSON.stringify({
        platform: "meta",
        objective: "leads",
        dailyBudget: 30,
      }),
    },
  });

  const allLeads = await prisma.lead.findMany({ where: { organizationId: org.id } });
  const igPrompt = "Lead Instagram nuovi interessati a Pechino con email";
  const igCriteria = parseAudiencePrompt(igPrompt);
  igCriteria.brandId = yoyiyoBrand.id;
  const igBuilt = buildAudienceFromLeads(allLeads, igCriteria);
  await prisma.audienceList.create({
    data: {
      organizationId: org.id,
      brandId: yoyiyoBrand.id,
      campaignId: adsCampaign.id,
      name: "IG Pechino email",
      kind: "AI_SEGMENT",
      description: `Generata da prompt: ${igPrompt}`,
      criteriaJson: JSON.stringify(igCriteria),
      memberCount: igBuilt.members.length,
      membersJson: JSON.stringify(igBuilt.members),
      lastBuiltAt: new Date(),
    },
  });

  const groupPrompt = "Groupage >20 da Facebook o WhatsApp con telefono";
  const groupCriteria = parseAudiencePrompt(groupPrompt);
  const groupBuilt = buildAudienceFromLeads(allLeads, groupCriteria);
  await prisma.audienceList.create({
    data: {
      organizationId: org.id,
      brandId: cigBrand.id,
      name: "Groupage social phone",
      kind: "AI_SEGMENT",
      description: `Generata da prompt: ${groupPrompt}`,
      criteriaJson: JSON.stringify(groupCriteria),
      memberCount: groupBuilt.members.length,
      membersJson: JSON.stringify(groupBuilt.members),
      lastBuiltAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      action: "SEED",
      entityType: "Organization",
      entityId: org.id,
      metaJson: JSON.stringify({
        message: "Demo Brand hub + inbox + social + growth ads/SEO/liste AI",
        imapReady: Boolean(imapPass),
        publicLanding: "/s/yoyiyo/cina-classic",
        inbox: inboxSync,
        socialPosts: 5,
        adsCampaignId: adsCampaign.id,
        audienceLists: 2,
      }),
    },
  });

  console.log("Seed OK");
  console.log("Login: demo@rotta.erp / rotta-demo");
  console.log(`Org: ${org.slug} | brands: ${org.brands.map((b) => b.slug).join(", ")}`);
  console.log(`IMAP password loaded: ${imapPass ? "yes" : "no (compila maschera canali)"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
