"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type NavLink = { label: string; href: string };

function isCurrent(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function MainNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <nav className="main-nav" aria-label="Main">
      <ul>
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} aria-current={isCurrent(pathname, l.href) ? "page" : undefined}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function MobileMenu({
  links,
  firmName,
  phone,
}: {
  links: NavLink[];
  firmName: string;
  phone: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus();
  }, []);

  // Close when navigating to a new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        className="btn btn-secondary btn-sm menu-toggle"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(true)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.8" fill="none" />
        </svg>
        Menu
      </button>
      <div
        id="mobile-menu"
        className="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label={`${firmName} navigation`}
        hidden={!open}
      >
        <div className="mobile-menu-head">
          <span className="brand-name" style={{ fontFamily: "var(--font-serif)", color: "var(--navy)" }}>
            {firmName}
          </span>
          <button ref={closeRef} type="button" className="btn btn-secondary btn-sm" onClick={close}>
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="1.8" fill="none" />
            </svg>
            Close
          </button>
        </div>
        <nav aria-label="Mobile">
          <ul>
            <li>
              <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>
                Home
              </Link>
            </li>
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} aria-current={isCurrent(pathname, l.href) ? "page" : undefined}>
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/faq" aria-current={isCurrent(pathname, "/faq") ? "page" : undefined}>
                FAQ
              </Link>
            </li>
          </ul>
        </nav>
        <div className="mobile-menu-foot">
          <Link href="/contact" className="btn btn-primary btn-block">
            Contact the office
          </Link>
          <p className="small muted" style={{ textAlign: "center", margin: 0 }}>
            Office: {phone} (in character)
          </p>
        </div>
      </div>
    </>
  );
}
