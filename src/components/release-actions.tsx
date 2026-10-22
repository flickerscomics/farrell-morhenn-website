"use client";

import { useState } from "react";

/** Print / save as PDF, copy link and email buttons for a press release. */
export function ReleaseActions({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };
  return (
    <div className="release-actions row">
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
        Print or save as PDF
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>
        {copied ? "Link copied" : "Copy link"}
      </button>
      <a className="btn btn-ghost btn-sm" href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`}>
        Email
      </a>
    </div>
  );
}
