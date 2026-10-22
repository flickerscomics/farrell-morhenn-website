import type { ReactNode } from "react";
import { site } from "@/lib/content";

/** A link for an email address. When the firm sets an email link page, it goes there instead of opening an email program. */
export function EmailLink({ address, children }: { address: string; children?: ReactNode }) {
  if (site.emailLink) {
    return (
      <a href={site.emailLink} target="_blank" rel="noopener noreferrer">
        {children ?? address}
      </a>
    );
  }
  return <a href={`mailto:${address}`}>{children ?? address}</a>;
}
