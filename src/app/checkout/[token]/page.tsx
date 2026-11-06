import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { eur } from "@/lib/format";
import { completeGuestCheckoutDemo } from "@/lib/actions/guest-sales";
import { btnPrimary, btnSecondary } from "@/components/ui";
import { StatusPill } from "@/components/StatusPill";

export default async function GuestCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string; err?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const checkout = await prisma.guestCheckout.findUnique({
    where: { token },
    include: { brand: true, organization: true, publicRequest: true },
  });
  if (!checkout) notFound();

  const quote = checkout.quoteId
    ? await prisma.quote.findUnique({
        where: { id: checkout.quoteId },
        include: { lines: true },
      })
    : null;

  const primary = checkout.brand?.primaryColor || "#0F3D3E";
  const paid = checkout.status === "PAID_DEMO" || sp.paid === "1";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#FFF8F6_0%,#EEF3F2_100%)]">
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Checkout guest</div>
        <h1
          className="mt-2 text-3xl"
          style={{ color: primary, fontFamily: "var(--font-display), Georgia, serif" }}
        >
          {checkout.brand?.name || checkout.organization.name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {checkout.guestName} · {checkout.guestEmail} · {checkout.paxCount} pax
        </p>
        <div className="mt-3">
          <StatusPill>{checkout.status}</StatusPill>
        </div>

        {sp.err ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            Checkout non valido o scaduto.
          </div>
        ) : null}

        <section className="mt-6 rounded-2xl border border-teal-900/10 bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-slate-400">Totale</div>
          <div className="mt-1 text-3xl font-semibold text-[#0F3D3E]">
            {checkout.totalSell > 0 ? eur(checkout.totalSell) : "Da preventivare"}
          </div>
          {quote ? (
            <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
              {quote.lines.map((l) => (
                <li key={l.id} className="flex justify-between gap-3">
                  <span>
                    {l.title} ×{l.quantity}
                  </span>
                  <span className="font-medium">{eur(l.unitPrice * l.quantity)}</span>
                </li>
              ))}
            </ul>
          ) : checkout.publicRequest ? (
            <p className="mt-3 text-sm text-slate-600">
              Richiesta: {checkout.publicRequest.destinations || "—"} ·{" "}
              {checkout.publicRequest.departureHint || "periodo da definire"}
            </p>
          ) : null}
        </section>

        {paid ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            Pagamento demo registrato
            {checkout.paymentRef ? ` · rif. ${checkout.paymentRef}` : ""}.
            Nessun addebito reale — PSP live fuori da questo ambiente.
          </div>
        ) : (
          <form action={completeGuestCheckoutDemo} className="mt-6 space-y-3">
            <input type="hidden" name="token" value={checkout.token} />
            <p className="text-sm text-slate-600">
              Pagamento sandbox: simula acconto/saldo senza chiavi Stripe/PayPal. In produzione
              collegare il PSP via secret Hostinger.
            </p>
            <button className={btnPrimary} type="submit">
              Paga (demo)
            </button>
            <a href={`/richiesta/${checkout.brand?.slug || "yoyiyo"}`} className={btnSecondary}>
              Torna alla richiesta
            </a>
          </form>
        )}
      </div>
    </div>
  );
}
