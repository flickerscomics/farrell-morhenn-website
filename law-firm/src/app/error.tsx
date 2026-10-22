"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="section">
      <div className="container confirmation">
        <p className="eyebrow" style={{ justifyContent: "center" }}>Something went wrong</p>
        <h1>We could not load this page</h1>
        <p className="lead" style={{ margin: "0 auto" }}>
          An unexpected error occurred. Nothing you submitted has been lost if you saw a confirmation reference.
        </p>
        {error.digest && <p className="small muted">Error reference: <span className="mono">{error.digest}</span></p>}
        <div className="row" style={{ justifyContent: "center", marginTop: "2rem" }}>
          <button type="button" className="btn btn-primary" onClick={() => reset()}>Try again</button>
          <Link href="/" className="btn btn-secondary">Homepage</Link>
        </div>
      </div>
    </main>
  );
}
