"use client";

import { useEffect, useState } from "react";

/**
 * Filter state kept in the URL query string, so filtered views can be linked
 * to and survive a reload. Works on a static host because everything happens
 * in the browser.
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const empty = Object.fromEntries(keys.map((k) => [k, ""])) as Record<K, string>;
  const [values, setValues] = useState<Record<K, string>>(empty);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setValues(Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ""])) as Record<K, string>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (patch: Partial<Record<K, string>>) => {
    const next = { ...values, ...patch };
    setValues(next);
    const params = new URLSearchParams();
    for (const k of keys) if (next[k]) params.set(k, next[k]);
    const qs = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  };

  const clear = () => update(empty);
  const active = keys.some((k) => values[k]);
  return { values, update, clear, active };
}

export function matches(text: string, query: string) {
  return text.toLowerCase().includes(query.trim().toLowerCase());
}
