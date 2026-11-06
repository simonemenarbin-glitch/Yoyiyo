import type { PrismaClient, SupplierConnector } from "@prisma/client";
import { createMockDmcAdapter } from "./mock-dmc";
import { createOwnListAdapter } from "./own-list";
import type { SupplierAdapter, SupplierOffer, SupplierSearchInput } from "./types";

function parseConfig(json: string | null | undefined): Record<string, unknown> {
  if (!json) return {};
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function adapterForConnector(
  prisma: PrismaClient,
  connector: SupplierConnector,
): SupplierAdapter | null {
  const config = parseConfig(connector.configJson);
  const markupPct = typeof config.markupPct === "number" ? config.markupPct : 20;

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
    case "NETSTORMING":
    case "HOTELSTON":
    case "BOKUN":
      // Live credentials not wired yet — fall back to labeled mock so UX stays testable.
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

export async function searchSupplierOffers(
  prisma: PrismaClient,
  input: SupplierSearchInput,
): Promise<SupplierOffer[]> {
  const connectors = await listEnabledConnectors(prisma, input.organizationId);
  const filtered = input.connectorCode
    ? connectors.filter((c) => c.code === input.connectorCode)
    : connectors;

  // Always include virtual own-list if no connectors yet or explicit own-list
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

  // If org has no SupplierConnector rows, still expose mock DMC for demos
  if (!connectors.length) {
    adapters.push(createMockDmcAdapter());
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

  return batches.flat().slice(0, 60);
}

export async function ensureDefaultConnectors(prisma: PrismaClient, organizationId: string) {
  const defaults = [
    {
      code: "own-list",
      name: "Listino proprio",
      kind: "OWN_LIST" as const,
      status: "READY" as const,
      configJson: JSON.stringify({ markupPct: 0 }),
    },
    {
      code: "mock-dmc",
      name: "Mock DMC Cina (API demo)",
      kind: "MOCK_DMC" as const,
      status: "READY" as const,
      configJson: JSON.stringify({ markupPct: 20, market: "CN" }),
    },
    {
      code: "travio",
      name: "Travio",
      kind: "TRAVIO" as const,
      status: "NEEDS_CREDENTIALS" as const,
      enabled: false,
      configJson: JSON.stringify({ markupPct: 20, note: "Abilita con credenziali org" }),
    },
    {
      code: "hotelston",
      name: "Hotelston",
      kind: "HOTELSTON" as const,
      status: "NEEDS_CREDENTIALS" as const,
      enabled: false,
      configJson: JSON.stringify({ markupPct: 5, note: "Hotel OTA-style markup 5%" }),
    },
  ];

  for (const row of defaults) {
    await prisma.supplierConnector.upsert({
      where: {
        organizationId_code: { organizationId, code: row.code },
      },
      create: { organizationId, ...row, enabled: row.enabled ?? true },
      update: {
        name: row.name,
        kind: row.kind,
        // do not flip enabled/status on existing rows
      },
    });
  }
}
