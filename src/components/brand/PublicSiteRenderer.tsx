import type { SiteBlock } from "@/lib/brand/metrics";
import { submitBrandSiteLead } from "@/lib/actions/brand";

export function PublicSiteRenderer({
  brandName,
  brandSlug,
  pageSlug,
  primaryColor,
  secondaryColor,
  title,
  subtitle,
  ctaLabel,
  blocks,
  showThanks,
}: {
  brandName: string;
  brandSlug: string;
  pageSlug: string;
  primaryColor: string;
  secondaryColor: string;
  title: string;
  subtitle?: string | null;
  ctaLabel?: string | null;
  blocks: SiteBlock[];
  showThanks?: boolean;
}) {
  return (
    <div
      className="min-h-screen text-slate-900"
      style={{
        background: `radial-gradient(circle at top left, ${primaryColor}18, transparent 42%), linear-gradient(180deg, #f7f4ef 0%, #eef3f2 100%)`,
      }}
    >
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 sm:py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div
            className="truncate text-lg font-semibold tracking-tight sm:text-xl"
            style={{ color: primaryColor, fontFamily: "Georgia, serif" }}
          >
            {brandName}
          </div>
          <a
            href="#richiedi"
            className="inline-flex min-h-11 shrink-0 items-center rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ background: secondaryColor }}
          >
            {ctaLabel || "Richiedi"}
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {showThanks ? (
          <div
            className="mb-8 rounded-2xl border px-5 py-4 text-sm"
            style={{ borderColor: `${primaryColor}33`, background: "#fff", color: primaryColor }}
          >
            Richiesta ricevuta. Vi rispondiamo dall’ufficio booking con una prima ipotesi di lavoro.
          </div>
        ) : null}

        {blocks.map((block, i) => {
          if (block.type === "hero") {
            return (
              <section key={i} className="mb-14">
                <h1
                  className="max-w-3xl text-3xl leading-tight sm:text-4xl md:text-5xl"
                  style={{ color: primaryColor, fontFamily: "Georgia, serif" }}
                >
                  {block.title || title}
                </h1>
                <p className="mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
                  {block.subtitle || subtitle || ""}
                </p>
                <a
                  href="#richiedi"
                  className="mt-6 inline-flex min-h-12 items-center rounded-full px-6 py-3 text-sm font-semibold text-white sm:mt-8"
                  style={{ background: secondaryColor }}
                >
                  {block.ctaLabel || ctaLabel || "Richiedi preventivo"}
                </a>
              </section>
            );
          }

          if (block.type === "features") {
            return (
              <section key={i} className="mb-14 grid gap-4 md:grid-cols-3">
                {block.items.map((item, j) => (
                  <div
                    key={j}
                    className="rounded-2xl border border-black/5 bg-white/80 p-5"
                  >
                    <h3 className="font-semibold" style={{ color: primaryColor }}>
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">{item.text}</p>
                  </div>
                ))}
              </section>
            );
          }

          if (block.type === "itinerary") {
            return (
              <section key={i} className="mb-14">
                <h2
                  className="mb-4 text-2xl"
                  style={{ color: primaryColor, fontFamily: "Georgia, serif" }}
                >
                  Idea di itinerario
                </h2>
                <div className="space-y-3">
                  {block.days.map((day, j) => (
                    <div
                      key={j}
                      className="flex gap-4 rounded-2xl border border-black/5 bg-white/80 p-4"
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                        style={{ background: primaryColor }}
                      >
                        {j + 1}
                      </div>
                      <div>
                        <div className="font-medium">{day.title}</div>
                        <div className="text-sm text-slate-600">{day.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          if (block.type === "trust") {
            return (
              <section key={i} className="mb-14 flex flex-wrap gap-3">
                {block.items.map((item, j) => (
                  <span
                    key={j}
                    className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-slate-700"
                  >
                    {item}
                  </span>
                ))}
              </section>
            );
          }

          if (block.type === "faq") {
            return (
              <section key={i} className="mb-14 space-y-3">
                <h2
                  className="text-2xl"
                  style={{ color: primaryColor, fontFamily: "Georgia, serif" }}
                >
                  Domande frequenti
                </h2>
                {block.items.map((item, j) => (
                  <details
                    key={j}
                    className="rounded-2xl border border-black/5 bg-white/80 p-4"
                  >
                    <summary className="cursor-pointer font-medium">{item.q}</summary>
                    <p className="mt-2 text-sm text-slate-600">{item.a}</p>
                  </details>
                ))}
              </section>
            );
          }

          if (block.type === "form") {
            return (
              <section
                key={i}
                id="richiedi"
                className="mb-14 scroll-mt-24 rounded-3xl border border-black/5 bg-white p-5 shadow-[0_20px_50px_rgba(15,61,62,0.08)] sm:p-6 md:p-8"
              >
                <h2
                  className="text-xl sm:text-2xl"
                  style={{ color: primaryColor, fontFamily: "Georgia, serif" }}
                >
                  {block.title}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Lasciate i dati: vi rispondiamo con un’ipotesi chiusa nei numeri.
                </p>
                <form action={submitBrandSiteLead} className="mt-6 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="brandSlug" value={brandSlug} />
                  <input type="hidden" name="pageSlug" value={pageSlug} />
                  {(block.fields.includes("nome") || block.fields.includes("name")) && (
                    <label className="block text-sm sm:col-span-2">
                      <span className="mb-1 block text-slate-600">Nome e cognome</span>
                      <input
                        name="nome"
                        required
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      />
                    </label>
                  )}
                  {block.fields.includes("email") && (
                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-600">Email</span>
                      <input
                        name="email"
                        type="email"
                        required
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      />
                    </label>
                  )}
                  {(block.fields.includes("telefono") || block.fields.includes("phone")) && (
                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-600">Telefono</span>
                      <input
                        name="telefono"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      />
                    </label>
                  )}
                  {block.fields.includes("pax") && (
                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-600">Persone</span>
                      <input
                        name="pax"
                        type="number"
                        defaultValue={2}
                        min={1}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      />
                    </label>
                  )}
                  {block.fields.includes("periodo") && (
                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-600">Periodo</span>
                      <input
                        name="periodo"
                        placeholder="es. ottobre 2026"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      />
                    </label>
                  )}
                  {(block.fields.includes("messaggio") || block.fields.includes("message")) && (
                    <label className="block text-sm sm:col-span-2">
                      <span className="mb-1 block text-slate-600">Messaggio</span>
                      <textarea
                        name="messaggio"
                        rows={4}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      />
                    </label>
                  )}
                  <button
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white sm:col-span-2 sm:w-fit"
                    style={{ background: secondaryColor }}
                  >
                    {ctaLabel || "Invia richiesta"}
                  </button>
                </form>
              </section>
            );
          }

          return null;
        })}
      </main>

      <footer className="border-t border-black/5 px-6 py-8 text-center text-xs text-slate-500">
        {brandName} · powered by Rotta
      </footer>
    </div>
  );
}
