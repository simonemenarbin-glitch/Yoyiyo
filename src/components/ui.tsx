import Link from "next/link";

/** Primary = teal scuro. Rosso solo per danger (btnDanger). */
export const btnPrimary =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0F3D3E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] hover:bg-[#0c3233] disabled:opacity-50";

export const btnSecondary =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-[#0F3D3E]/20 bg-white px-4 py-2.5 text-sm font-semibold text-[#0F3D3E] shadow-sm transition active:scale-[0.98] hover:bg-slate-50 disabled:opacity-50";

export const btnGhost =
  "inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-medium text-[#0F3D3E]/80 transition hover:bg-[#0F3D3E]/5";

/** @deprecated Usa btnPrimary (ora teal). Mantenuto per compat. */
export const btnDark = btnPrimary;

export const btnDanger =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 shadow-sm transition active:scale-[0.98] hover:bg-red-100 disabled:opacity-50";

export const fieldClass =
  "w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#0F3D3E]/40 focus:ring-2 focus:ring-[#0F3D3E]/15";

export function PageHeader({
  eyebrow,
  title,
  description,
  backHref,
  backLabel,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {backHref ? (
          <Link href={backHref} className="text-sm font-medium text-teal-800/80 hover:underline">
            ← {backLabel || "Indietro"}
          </Link>
        ) : null}
        {eyebrow ? (
          <div className={`text-xs uppercase tracking-[0.18em] text-teal-900/50 ${backHref ? "mt-2" : ""}`}>
            {eyebrow}
          </div>
        ) : null}
        <h1
          className={`text-2xl text-[#0F3D3E] sm:text-3xl ${eyebrow || backHref ? "mt-1" : ""}`}
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function SectionCard({
  title,
  hint,
  children,
  action,
  id,
}: {
  title?: string;
  hint?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border border-teal-900/10 bg-white/90 p-4 shadow-[0_8px_24px_rgba(15,61,62,0.05)] sm:p-5"
    >
      {title ? (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[#0F3D3E] sm:text-lg">{title}</h2>
            {hint ? <p className="mt-0.5 text-sm text-slate-500">{hint}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Field({
  label,
  name,
  children,
  hint,
  className = "",
}: {
  label: string;
  name?: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1.5 block font-medium text-slate-700">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
      {name ? null : null}
    </label>
  );
}

/** Nasconde dettagli tecnici senza perderli. */
export function SoftDetails({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      {...(defaultOpen ? { open: true } : {})}
      className="group rounded-xl border border-slate-200 bg-slate-50/80 open:bg-white"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-[#0F3D3E] marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="text-slate-400 transition group-open:rotate-90">▸</span>
        {summary}
      </summary>
      <div className="space-y-3 border-t border-slate-100 px-4 py-4">{children}</div>
    </details>
  );
}

export function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-teal-900/15 bg-slate-50/50 px-4 py-6 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

/** Empty state unificato: titolo + spiegazione + CTA opzionale. */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-teal-900/15 bg-slate-50/60 px-5 py-8 text-center">
      <div className="text-base font-semibold text-[#0F3D3E]">{title}</div>
      {children ? (
        <div className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">{children}</div>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function FlashOk({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-teal-800/15 bg-teal-50 px-4 py-3 text-sm text-teal-900">
      {children}
    </div>
  );
}

/** Badge discreto per ambienti demo / offline. */
export function DemoBadge({ label = "Demo" }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-50/90">
      {label}
    </span>
  );
}
