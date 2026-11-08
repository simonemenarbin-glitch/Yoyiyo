"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  match?: (p: string) => boolean;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

const sales: NavItem[] = [
  {
    href: "/app/crm",
    label: "Pipeline",
    match: (p) => p.startsWith("/app/crm") && !p.startsWith("/app/crm/canali"),
  },
  { href: "/app/inbox", label: "Inbox" },
  { href: "/app/preventivi", label: "Preventivi" },
  { href: "/app/pratiche", label: "Pratiche" },
];

const marketing: NavItem[] = [
  { href: "/app/landing", label: "Landing" },
  { href: "/app/social", label: "Social" },
  { href: "/app/growth", label: "Growth" },
];

const ops: NavItem[] = [
  { href: "/app/catalogo", label: "Listino" },
  { href: "/app/fornitori", label: "Fornitori" },
  { href: "/app/clienti", label: "Clienti" },
  { href: "/app/marchi", label: "Marchi" },
  { href: "/app/crm/canali", label: "Canali" },
];

const finance: NavItem[] = [{ href: "/app/contabilita", label: "Fatture" }];

const groups: NavGroup[] = [
  { id: "vendite", label: "Vendite", items: sales },
  { id: "marketing", label: "Marketing", items: marketing },
  { id: "ops", label: "Ops", items: ops },
  { id: "finance", label: "Finance", items: finance },
];

/** High-frequency desktop pins (HubSpot-style). Rest lives in Altro. */
const desktopPins: NavItem[] = [
  { href: "/app", label: "Home", match: (p) => p === "/app" },
  sales[0],
  sales[1],
  sales[2],
  sales[3],
];

const mobilePrimary: NavItem[] = [
  { href: "/app", label: "Home", match: (p) => p === "/app" },
  sales[0],
  sales[1],
];

function isActive(pathname: string, item: NavItem) {
  if (item.match) return item.match(pathname);
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

function groupActive(pathname: string, group: NavGroup) {
  return group.items.some((item) => isActive(pathname, item));
}

function linkClass(active: boolean, compact = false) {
  const base = compact
    ? "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[11px] font-medium"
    : "rounded-lg px-3 py-2 text-sm font-medium transition";
  return active
    ? `${base} bg-white/15 text-white`
    : `${base} text-teal-50/80 hover:bg-white/10 hover:text-white`;
}

function GroupMenu({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const active = groupActive(pathname, group);


  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={linkClass(active || open)}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        {group.label}
        <span className="ml-1 text-[10px] opacity-70" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div
          id={menuId}
          className="absolute left-0 z-50 mt-2 min-w-[11rem] rounded-2xl border border-teal-900/10 bg-white p-1.5 shadow-xl"
        >
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-xl px-3 py-2.5 text-sm font-medium ${
                isActive(pathname, item)
                  ? "bg-[#0F3D3E]/8 text-[#0F3D3E]"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AltroMenu({
  pathname,
  compactTrigger = false,
}: {
  pathname: string;
  compactTrigger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const overflowActive = [...marketing, ...ops, ...finance].some((item) =>
    isActive(pathname, item),
  );


  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`relative ${compactTrigger ? "flex flex-1" : ""}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          compactTrigger
            ? linkClass(open || overflowActive, true)
            : linkClass(open || overflowActive)
        }
        aria-expanded={open}
        aria-controls={menuId}
      >
        {compactTrigger ? (
          <>
            <span className="text-base leading-none" aria-hidden>
              ···
            </span>
            Altro
          </>
        ) : (
          <>
            Altro
            <span className="ml-1 text-[10px] opacity-70" aria-hidden>
              ▾
            </span>
          </>
        )}
      </button>
      {open ? (
        compactTrigger ? (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Chiudi menu"
              onClick={() => setOpen(false)}
            />
            <div
              id={menuId}
              className="absolute inset-x-0 bottom-16 mx-3 max-h-[70vh] overflow-y-auto rounded-2xl border border-teal-900/10 bg-white p-3 shadow-2xl"
            >
              {groups.map((group) => (
                <div key={group.id} className="mb-3 last:mb-0">
                  <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {group.label}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="min-h-12 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm font-semibold text-[#0F3D3E]"
                        onClick={() => setOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            id={menuId}
            className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-teal-900/10 bg-white p-2 shadow-xl"
          >
            {groups.map((group) => (
              <div key={group.id} className="mb-2 last:mb-0">
                <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {group.label}
                </div>
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-xl px-3 py-2 text-sm font-medium ${
                      isActive(pathname, item)
                        ? "bg-[#0F3D3E]/8 text-[#0F3D3E]"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}

export function DesktopNav() {
  const pathname = usePathname() || "/app";
  return (
    <nav className="hidden items-center gap-0.5 xl:flex">
      {desktopPins.map((item) => (
        <Link key={item.href} href={item.href} className={linkClass(isActive(pathname, item))}>
          {item.label}
        </Link>
      ))}
      <span className="mx-1 h-5 w-px bg-white/20" aria-hidden />
      {groups
        .filter((g) => g.id !== "vendite")
        .map((group) => (
          <GroupMenu key={group.id} group={group} pathname={pathname} />
        ))}
      <AltroMenu pathname={pathname} />
    </nav>
  );
}

/** Mid breakpoints: pins + Altro (grouped). */
export function CompactDesktopNav() {
  const pathname = usePathname() || "/app";
  return (
    <nav className="hidden items-center gap-0.5 lg:flex xl:hidden">
      {desktopPins.slice(0, 4).map((item) => (
        <Link key={item.href} href={item.href} className={linkClass(isActive(pathname, item))}>
          {item.label}
        </Link>
      ))}
      <AltroMenu pathname={pathname} />
    </nav>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname() || "/app";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-teal-900/10 bg-[#0F3D3E] pb-[env(safe-area-inset-bottom)] text-white lg:hidden">
      <div className="mx-auto flex max-w-7xl items-stretch px-1">
        {mobilePrimary.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={linkClass(isActive(pathname, item), true)}
          >
            <span className="text-base leading-none" aria-hidden>
              {item.label === "Home" ? "⌂" : item.label === "Pipeline" ? "☰" : "✉"}
            </span>
            {item.label}
          </Link>
        ))}
        <AltroMenu pathname={pathname} compactTrigger />
      </div>
    </nav>
  );
}

export function MobileTopMenu() {
  const pathname = usePathname() || "/app";
  const [open, setOpen] = useState(false);


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
        <div className="absolute right-0 z-50 mt-2 max-h-[70vh] w-64 overflow-y-auto rounded-2xl border border-teal-900/10 bg-white p-2 shadow-xl">
          <Link
            href="/app"
            className={`block rounded-xl px-3 py-3 text-sm font-medium ${
              pathname === "/app" ? "bg-[#0F3D3E]/8 text-[#0F3D3E]" : "text-slate-700"
            }`}
            onClick={() => setOpen(false)}
          >
            Home
          </Link>
          {groups.map((group) => (
            <div key={group.id} className="mt-1">
              <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {group.label}
              </div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-xl px-3 py-2.5 text-sm font-medium ${
                    isActive(pathname, item)
                      ? "bg-[#0F3D3E]/8 text-[#0F3D3E]"
                      : "text-slate-700"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
