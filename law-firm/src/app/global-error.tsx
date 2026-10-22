"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem 1.5rem", textAlign: "center", color: "#1b1f27" }}>
        <h1>The site is temporarily unavailable</h1>
        <p>Please try again in a moment.</p>
        <button type="button" onClick={() => reset()} style={{ padding: "0.6rem 1.2rem", cursor: "pointer" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
