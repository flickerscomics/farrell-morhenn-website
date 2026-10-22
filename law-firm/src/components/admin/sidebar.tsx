"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export type NavGroup = { label: string; items: { href: string; label: string; count?: number }[] };

export function AdminChrome({ groups, brand, topbar, children }: { groups: NavGroup[]; brand: ReactNode; topbar: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const current = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/"));

  return (
    <div className="admin-shell">
      <a href="#admin-main" className="skip-link">Skip to content</a>
      <aside className="admin-sidebar" id="admin-sidebar" data-open={open} aria-label="Administration">
        {brand}
        <nav className="admin-nav">
          {groups.map((g) => (
            <div key={g.label}>
              <h2>{g.label}</h2>
              <ul>
                {g.items.map((i) => (
                  <li key={i.href}>
                    <Link href={i.href} aria-current={current(i.href) ? "page" : undefined}>
                      <span>{i.label}</span>
                      {!!i.count && <span className="count" aria-label={`${i.count} need attention`}>{i.count}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      {open && <button type="button" className="admin-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />}
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="btn btn-secondary btn-sm admin-menu-toggle"
            aria-expanded={open}
            aria-controls="admin-sidebar"
            onClick={() => setOpen((o) => !o)}
          >
            Menu
          </button>
          {topbar}
        </header>
        <main id="admin-main" className="admin-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
