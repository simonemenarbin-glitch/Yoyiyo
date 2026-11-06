import Link from "next/link";

const areas = [
  "Vendita multi-canale",
  "Catalogo e contratti",
  "Pratiche e operations",
  "CRM omnicanale",
  "Reporting direzionale",
  "Multi-brand / multi-tenant",
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#1a5a5c_0%,#0F3D3E_42%,#071f20_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="text-sm uppercase tracking-[0.28em] text-teal-100/80">Rotta ERP</div>
          <Link
            href="/login"
            className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
          >
            Accedi
          </Link>
        </header>

        <section className="mt-24 max-w-3xl">
          <h1
            className="text-5xl leading-tight tracking-tight md:text-6xl"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            Tutto il business viaggi,
            <span className="block text-teal-100/90">in un&apos;unica piattaforma cloud.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-teal-50/80">
            Nucleo Medusa-like: organizzazioni multi-brand, catalogo/contratti, pratiche
            multi-servizio e vendita B2B/web. Costruito per crescere fino a CRM, marketing,
            AI e contabilità.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#0F3D3E]"
            >
              Entra nella demo
            </Link>
            <a
              href="#moduli"
              className="rounded-full border border-white/25 px-5 py-3 text-sm text-teal-50"
            >
              Vedi i moduli
            </a>
          </div>
          <p className="mt-4 text-sm text-teal-100/60">
            Demo: demo@rotta.erp / rotta-demo
          </p>
        </section>

        <section id="moduli" className="mt-auto grid gap-3 py-16 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <div
              key={area}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-teal-50/90 backdrop-blur"
            >
              {area}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
