import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { submitPublicQuoteRequest } from "@/lib/actions/guest-sales";
import { fieldClass, btnPrimary } from "@/components/ui";

export default async function PublicQuoteRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ brandSlug: string }>;
  searchParams: Promise<{ ok?: string; checkout?: string; err?: string }>;
}) {
  const { brandSlug } = await params;
  const sp = await searchParams;
  const brand = await prisma.brand.findFirst({
    where: { slug: brandSlug, status: "ACTIVE" },
  });
  if (!brand) notFound();

  const primary = brand.primaryColor || "#0F3D3E";
  const secondary = brand.secondaryColor || "#B33A2B";

  return (
    <div
      className="min-h-screen"
      style={{
        background: `radial-gradient(circle at top, ${primary}14, transparent 40%), linear-gradient(180deg,#fff8f6,#eef3f2)`,
      }}
    >
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Richiesta preventivo</div>
        <h1
          className="mt-2 text-3xl"
          style={{ color: primary, fontFamily: "var(--font-display), Georgia, serif" }}
        >
          {brand.name}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {brand.tagline || "Raccontateci il viaggio: vi rispondiamo con un’ipotesi chiusa nei numeri."}
        </p>

        {sp.ok ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            Richiesta inviata. L’ufficio booking vi ricontatta a breve.
            {sp.checkout ? (
              <div className="mt-2">
                Checkout guest (demo):{" "}
                <Link href={`/checkout/${sp.checkout}`} className="font-semibold underline">
                  apri pagamento
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}

        {sp.err ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Impossibile inviare ({sp.err}).
          </div>
        ) : null}

        {!sp.ok ? (
          <form action={submitPublicQuoteRequest} className="mt-8 space-y-3 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <input type="hidden" name="brandSlug" value={brand.slug} />
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Nome e cognome</span>
              <input name="nome" required className={fieldClass} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Email</span>
              <input name="email" type="email" required className={fieldClass} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Telefono</span>
              <input name="telefono" className={fieldClass} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Persone</span>
                <input name="pax" type="number" min={1} defaultValue={2} className={fieldClass} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Budget indicativo €</span>
                <input name="budget" type="number" className={fieldClass} />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Destinazioni</span>
              <input name="destinazioni" placeholder="Pechino, Shanghai…" className={fieldClass} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Periodo</span>
              <input name="periodo" placeholder="ottobre 2026" className={fieldClass} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Messaggio</span>
              <textarea name="messaggio" rows={4} className={fieldClass} />
            </label>
            <button className={btnPrimary} style={{ background: secondary }}>
              Invia richiesta
            </button>
          </form>
        ) : null}

        <p className="mt-8 text-center text-xs text-slate-500">
          <Link href={`/s/${brand.slug}/cina-classic`} className="underline">
            Torna al sito brand
          </Link>
        </p>
      </div>
    </div>
  );
}
