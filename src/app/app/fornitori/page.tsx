import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import { setConnectorEnabled } from "@/lib/actions/quotes-pricing";
import { ensureDefaultConnectors, adapterForConnector } from "@/lib/suppliers/registry";
import { PageHeader, SectionCard, btnSecondary } from "@/components/ui";
import { SandboxTester } from "@/components/suppliers/SandboxTester";

const kindLabel: Record<string, string> = {
  OWN_LIST: "Listino proprio",
  MOCK_DMC: "API demo / sandbox",
  TRAVIO: "Travio",
  NETSTORMING: "NetStorming",
  HOTELSTON: "Hotelston",
  BOKUN: "Bokun",
  MANUAL_API: "API manuale",
};

const statusLabel: Record<string, string> = {
  READY: "Pronto",
  NEEDS_CREDENTIALS: "Serve credenziali",
  DISABLED: "Disabilitato",
  ERROR: "Errore",
};

export default async function FornitoriPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;

  await ensureDefaultConnectors(prisma, membership.organizationId);

  const connectors = await prisma.supplierConnector.findMany({
    where: { organizationId: membership.organizationId },
    orderBy: [{ enabled: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Produzione"
        title="Fornitori e connettori"
        description="Interfaccia adapter unica (search / quote / book / cancel). Travio e Hotelston espongono sandbox ricchi senza chiavi live — i secret restano fuori dal repo."
        actions={
          <Link href="/app/preventivi" className={btnSecondary}>
            Usa in preventivo
          </Link>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-teal-900/10 bg-white/80">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#0F3D3E] text-white">
            <tr>
              <th className="px-4 py-3 font-medium">Connettore</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Capability</th>
              <th className="px-4 py-3 font-medium">Stato</th>
              <th className="px-4 py-3 font-medium">Attivo</th>
              <th className="px-4 py-3 font-medium text-right">Azione</th>
            </tr>
          </thead>
          <tbody>
            {connectors.map((c) => {
              const adapter = adapterForConnector(prisma, c);
              const caps = adapter?.capabilities;
              return (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#0F3D3E]">{c.name}</div>
                    <div className="text-xs text-slate-500">{c.code}</div>
                  </td>
                  <td className="px-4 py-3">{kindLabel[c.kind] || c.kind}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {caps
                      ? [
                          caps.search && "search",
                          caps.quote && "quote",
                          caps.book && "book",
                          caps.cancel && "cancel",
                          caps.sandbox && "sandbox",
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill>{statusLabel[c.status] || c.status}</StatusPill>
                  </td>
                  <td className="px-4 py-3">{c.enabled ? "Sì" : "No"}</td>
                  <td className="px-4 py-3 text-right">
                    {c.kind === "OWN_LIST" ? (
                      <span className="text-xs text-slate-400">sempre on</span>
                    ) : (
                      <form action={setConnectorEnabled} className="inline">
                        <input type="hidden" name="connectorId" value={c.id} />
                        <input type="hidden" name="enabled" value={c.enabled ? "0" : "1"} />
                        <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-[#0F3D3E]">
                          {c.enabled ? "Disabilita" : "Abilita"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SectionCard
        title="Sandbox tester"
        hint="Travio = pacchetti/DMC · Hotelston = hotel OTA (markup 5%). Nessuna chiave richiesta."
      >
        <SandboxTester
          connectors={connectors.map((c) => ({
            code: c.code,
            name: c.name,
            enabled: c.enabled,
          }))}
        />
      </SectionCard>
    </div>
  );
}
