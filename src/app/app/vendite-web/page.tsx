import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import { PageHeader, btnSecondary } from "@/components/ui";
import { shortDate } from "@/lib/format";
import { createCheckoutFromQuote } from "@/lib/actions/guest-sales";

export default async function VenditeWebPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const orgId = membership.organizationId;

  const [requests, checkouts, quotes] = await Promise.all([
    prisma.publicQuoteRequest.findMany({
      where: { organizationId: orgId },
      include: { brand: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.guestCheckout.findMany({
      where: { organizationId: orgId },
      include: { brand: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.quote.findMany({
      where: { organizationId: orgId, status: { in: ["SENT", "DRAFT"] } },
      orderBy: { updatedAt: "desc" },
      take: 15,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vendita multi-canale"
        title="Richieste pubbliche e checkout guest"
        description="Form /richiesta/[brand], landing brand e checkout demo senza PSP live."
        actions={
          <Link href="/richiesta/yoyiyo" className={btnSecondary} target="_blank">
            Apri form Yoyiyo
          </Link>
        }
      />

      <section className="rounded-2xl border border-teal-900/10 bg-white/90 p-4">
        <h2 className="mb-3 text-lg font-semibold text-[#0F3D3E]">Richieste pubbliche</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-2 pr-3">Quando</th>
                <th className="py-2 pr-3">Ospite</th>
                <th className="py-2 pr-3">Brand</th>
                <th className="py-2 pr-3">Destinazioni</th>
                <th className="py-2">Stato</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="py-2 pr-3">{shortDate(r.createdAt)}</td>
                  <td className="py-2 pr-3">
                    <div className="font-medium">
                      {r.firstName} {r.lastName}
                    </div>
                    <div className="text-xs text-slate-500">{r.email}</div>
                  </td>
                  <td className="py-2 pr-3">{r.brand?.name || "—"}</td>
                  <td className="py-2 pr-3">{r.destinations || r.departureHint || "—"}</td>
                  <td className="py-2">
                    <StatusPill>{r.status}</StatusPill>
                  </td>
                </tr>
              ))}
              {!requests.length ? (
                <tr>
                  <td colSpan={5} className="py-3 text-slate-500">
                    Nessuna richiesta — prova /richiesta/yoyiyo
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-teal-900/10 bg-white/90 p-4">
        <h2 className="mb-3 text-lg font-semibold text-[#0F3D3E]">Checkout guest</h2>
        <ul className="space-y-2 text-sm">
          {checkouts.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2"
            >
              <div>
                <div className="font-medium">{c.guestName}</div>
                <div className="text-xs text-slate-500">
                  {c.guestEmail} · {c.status}
                </div>
              </div>
              <Link href={`/checkout/${c.token}`} className="text-teal-800 underline" target="_blank">
                Apri
              </Link>
            </li>
          ))}
          {!checkouts.length ? <li className="text-slate-500">Nessun checkout.</li> : null}
        </ul>
      </section>

      <section className="rounded-2xl border border-teal-900/10 bg-white/90 p-4">
        <h2 className="mb-3 text-lg font-semibold text-[#0F3D3E]">Apri checkout da preventivo</h2>
        <ul className="space-y-2">
          {quotes.map((q) => (
            <li
              key={q.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 text-sm"
            >
              <Link href={`/app/preventivi/${q.id}`} className="font-medium text-[#0F3D3E] hover:underline">
                {q.number} — {q.title}
              </Link>
              <form action={createCheckoutFromQuote}>
                <input type="hidden" name="quoteId" value={q.id} />
                <button className={btnSecondary + " !min-h-9 !text-xs"}>Checkout guest</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
