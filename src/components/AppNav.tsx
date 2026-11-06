"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const primary = [
  { href: "/app", label: "Home", match: (p: string) => p === "/app" },
  { href: "/app/crm", label: "Pipeline", match: (p: string) => p.startsWith("/app/crm") && !p.startsWith("/app/crm/canali") },
  { href: "/app/crm/canali", label: "Aggiorna", match: (p: string) => p.startsWith("/app/crm/canali") },
  { href: "/app/marchi", label: "Marchi", match: (p: string) => p.startsWith("/app/marchi") },
];

const more = [
  { href: "/app/preventivi", label: "Preventivi" },
  { href: "/app/pratiche", label: "Pratiche" },
  { href: "/app/catalogo", label: "Catalogo" },
  { href: "/app/fornitori", label: "Fornitori" },
  { href: "/app/b2b", label: "B2B" },
  { href: "/app/vendite-web", label: "Web" },
  { href: "/app/reporting", label: "Report" },
  { href: "/app/clienti", label: "Clienti" },
];

function linkClass(active: boolean, compact = false) {
  const base = compact
    ? "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[11px] font-medium"
    : "rounded-lg px-3 py-2 text-sm font-medium transition";
  return active
    ? `${base} bg-white/15 text-white`
    : `${base} text-teal-50/80 hover:bg-white/10 hover:text-white`;
}

export function DesktopNav() {
  const pathname = usePathname() || "/app";
  const all = [...primary, ...more];
  return (
    <nav className="hidden items-center gap-0.5 lg:flex">
      {all.map((item) => {
        const active =
          "match" in item && typeof item.match === "function"
            ? item.match(pathname)
            : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link key={item.href} href={item.href} className={linkClass(active)}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname() || "/app";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const moreActive = more.some(
    (m) => pathname === m.href || pathname.startsWith(m.href + "/"),
  );

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Chiudi menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-16 mx-3 rounded-2xl border border-teal-900/10 bg-white p-3 shadow-2xl">
            <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Altro
            </div>
            <div className="grid grid-cols-2 gap-2">
              {more.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="min-h-12 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm font-semibold text-[#0F3D3E]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-teal-900/10 bg-[#0F3D3E] pb-[env(safe-area-inset-bottom)] text-white lg:hidden">
        <div className="mx-auto flex max-w-7xl items-stretch px-1">
          {primary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={linkClass(item.match(pathname), true)}
            >
              <span className="text-base leading-none" aria-hidden>
                {item.label === "Home"
                  ? "⌂"
                  : item.label === "Pipeline"
                    ? "☰"
                    : item.label === "Aggiorna"
                      ? "↻"
                      : "◆"}
              </span>
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={linkClass(open || moreActive, true)}
            aria-expanded={open}
          >
            <span className="text-base leading-none" aria-hidden>
              ···
            </span>
            Altro
          </button>
        </div>
      </nav>
    </>
  );
}

export function MobileTopMenu() {
  const pathname = usePathname() || "/app";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const all = [...primary, ...more];

  return (
    <div className="relative lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-white/20 px-3 text-sm font-medium"
        aria-expanded={open}
        aria-label="Menu"
      >
        Menu
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-teal-900/10 bg-white p-2 shadow-xl">
          {all.map((item) => {
            const active =
              "match" in item && typeof item.match === "function"
                ? item.match(pathname)
                : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-xl px-3 py-3 text-sm font-medium ${
                  active ? "bg-[#0F3D3E]/8 text-[#0F3D3E]" : "text-slate-700"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
