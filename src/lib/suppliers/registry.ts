import type { PrismaClient, SupplierConnector } from "@prisma/client";
import { createHotelstonSandboxAdapter } from "./hotelston-sandbox";
import { createMockDmcAdapter } from "./mock-dmc";
import { createOwnListAdapter } from "./own-list";
import { createTravioSandboxAdapter } from "./travio-sandbox";
import type {
  SupplierAdapter,
  SupplierBookInput,
  SupplierBookResult,
  SupplierCancelResult,
  SupplierOffer,
  SupplierQuoteResult,
  SupplierSearchInput,
} from "./types";

function parseConfig(json: string | null | undefined): Record<string, unknown> {
  if (!json) return {};
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function adapterForConnector(
  prisma: PrismaClient,
  connector: SupplierConnector,
): SupplierAdapter | null {
  const config = parseConfig(connector.configJson);
  const markupPct = typeof config.markupPct === "number" ? config.markupPct : 20;
  const mode = typeof config.mode === "string" ? config.mode : "sandbox";

  switch (connector.kind) {
    case "OWN_LIST":
      return createOwnListAdapter(prisma);
    case "MOCK_DMC":
    case "MANUAL_API":
      return createMockDmcAdapter({
        code: connector.code,
        name: connector.name,
        markupPct,
      });
    case "TRAVIO":
      if (mode === "live") {
        // Live path reserved — falls back to labeled sandbox until org secrets exist.
        return createTravioSandboxAdapter({
          code: connector.code,
          name: `${connector.name} (sandbox→live pending)`,
          markupPct: typeof config.markupPct === "number" ? config.markupPct : 18,
        });
      }
      return createTravioSandboxAdapter({
        code: connector.code,
        name: connector.name,
        markupPct: typeof config.markupPct === "number" ? config.markupPct : 18,
      });
    case "HOTELSTON":
      return createHotelstonSandboxAdapter({
        code: connector.code,
        name: mode === "live" ? `${connector.name} (sandbox→live pending)` : connector.name,
        markupPct: typeof config.markupPct === "number" ? config.markupPct : 5,
      });
    case "NETSTORMING":
    case "BOKUN":
      return createMockDmcAdapter({
        code: connector.code,
        name: `${connector.name} (sandbox)`,
        markupPct,
      });
    default:
      return null;
  }
}

export async function listEnabledConnectors(prisma: PrismaClient, organizationId: string) {
  return prisma.supplierConnector.findMany({
    where: { organizationId, enabled: true, status: { not: "DISABLED" } },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });
}

export async function getConnectorAdapter(
  prisma: PrismaClient,
  organizationId: string,
  connectorCode: string,
): Promise<{ connector: SupplierConnector; adapter: SupplierAdapter } | null> {
  const connector = await prisma.supplierConnector.findFirst({
    where: { organizationId, code: connectorCode },
  });
  if (!connector) {
    if (connectorCode === "own-list") {
      const virtual = {
        id: "virtual-own-list",
        organizationId,
        code: "own-list",
        name: "Listino proprio",
        kind: "OWN_LIST" as const,
        status: "READY" as const,
        enabled: true,
        baseUrl: null,
        configJson: null,
        lastError: null,
        lastSyncAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return { connector: virtual, adapter: createOwnListAdapter(prisma) };
    }
    return null;
  }
  const adapter = adapterForConnector(prisma, connector);
  if (!adapter) return null;
  return { connector, adapter };
}

export async function searchSupplierOffers(
  prisma: PrismaClient,
  input: SupplierSearchInput,
): Promise<SupplierOffer[]> {
  const connectors = await listEnabledConnectors(prisma, input.organizationId);
  const filtered = input.connectorCode
    ? connectors.filter((c) => c.code === input.connectorCode)
    : connectors;

  const adapters: SupplierAdapter[] = [];
  const hasOwn = filtered.some((c) => c.kind === "OWN_LIST" || c.code === "own-list");
  if (!filtered.length || input.connectorCode === "own-list" || hasOwn || !input.connectorCode) {
    adapters.push(createOwnListAdapter(prisma));
  }

  for (const c of filtered) {
    if (c.kind === "OWN_LIST" || c.code === "own-list") continue;
    const a = adapterForConnector(prisma, c);
    if (a) adapters.push(a);
  }

  if (!connectors.length) {
    adapters.push(createMockDmcAdapter());
    adapters.push(createTravioSandboxAdapter());
    adapters.push(createHotelstonSandboxAdapter());
  }

  const seen = new Set<string>();
  const uniqueAdapters = adapters.filter((a) => {
    if (seen.has(a.code)) return false;
    seen.add(a.code);
    return true;
  });

  const batches = await Promise.all(
    uniqueAdapters.map(async (adapter) => {
      try {
        return await adapter.search(input);
      } catch {
        return [] as SupplierOffer[];
      }
    }),
  );

  return batches.flat().slice(0, 80);
}

export async function quoteSupplierOffer(
  prisma: PrismaClient,
  organizationId: string,
  connectorCode: string,
  offerId: string,
): Promise<SupplierQuoteResult | null> {
  const pair = await getConnectorAdapter(prisma, organizationId, connectorCode);
  if (!pair?.adapter.quote) return null;
  return pair.adapter.quote(offerId, parseConfig(pair.connector.configJson));
}

export async function bookSupplierOffer(
  prisma: PrismaClient,
  organizationId: string,
  connectorCode: string,
  input: SupplierBookInput,
): Promise<SupplierBookResult | null> {
  const pair = await getConnectorAdapter(prisma, organizationId, connectorCode);
  if (!pair?.adapter.book) return null;
  return pair.adapter.book(input, parseConfig(pair.connector.configJson));
}

export async function cancelSupplierBooking(
  prisma: PrismaClient,
  organizationId: string,
  connectorCode: string,
  bookingRef: string,
): Promise<SupplierCancelResult | null> {
  const pair = await getConnectorAdapter(prisma, organizationId, connectorCode);
  if (!pair?.adapter.cancel) return null;
  return pair.adapter.cancel(bookingRef, parseConfig(pair.connector.configJson));
}

export async function ensureDefaultConnectors(prisma: PrismaClient, organizationId: string) {
  const defaults = [
    {
      code: "own-list",
      name: "Listino proprio",
      kind: "OWN_LIST" as const,
      status: "READY" as const,
      enabled: true,
      configJson: JSON.stringify({ markupPct: 0, mode: "local" }),
    },
    {
      code: "mock-dmc",
      name: "Mock DMC Cina (API demo)",
      kind: "MOCK_DMC" as const,
      status: "READY" as const,
      enabled: true,
      configJson: JSON.stringify({ markupPct: 20, market: "CN", mode: "sandbox" }),
    },
    {
      code: "travio",
      name: "Travio",
      kind: "TRAVIO" as const,
      status: "READY" as const,
      enabled: true,
      configJson: JSON.stringify({
        markupPct: 18,
        mode: "sandbox",
        note: "Sandbox ricco attivo; per live impostare mode=live + secret env",
      }),
    },
    {
      code: "hotelston",
      name: "Hotelston",
      kind: "HOTELSTON" as const,
      status: "READY" as const,
      enabled: true,
      configJson: JSON.stringify({
        markupPct: 5,
        mode: "sandbox",
        note: "OTA hotel sandbox; live keys via Hostinger env",
      }),
    },
    {
      code: "netstorming",
      name: "NetStorming",
      kind: "NETSTORMING" as const,
      status: "NEEDS_CREDENTIALS" as const,
      enabled: false,
      configJson: JSON.stringify({ markupPct: 15, mode: "sandbox" }),
    },
    {
      code: "bokun",
      name: "Bokun",
      kind: "BOKUN" as const,
      status: "NEEDS_CREDENTIALS" as const,
      enabled: false,
      configJson: JSON.stringify({ markupPct: 12, mode: "sandbox" }),
    },
  ];

  for (const row of defaults) {
    await prisma.supplierConnector.upsert({
      where: {
        organizationId_code: { organizationId, code: row.code },
      },
      create: { organizationId, ...row },
      update: {
        name: row.name,
        kind: row.kind,
        // Promote travio/hotelston to READY sandbox (enable) if older seed left them stubbed
        ...(row.code === "travio" || row.code === "hotelston"
          ? { status: "READY" as const, enabled: true, configJson: row.configJson }
          : {}),
      },
    });
  }
}
