"use client";

/**
 * The last resort, when even the layout fails: its own <html> and inline styles in the site's
 * colours, so it shows even if the fonts or the stylesheet did not load. The code matches the
 * server's log line for a bug report.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#12121a", color: "#efeff3", font: "16px/1.5 system-ui, sans-serif" }}>
        <main style={{ maxWidth: 480, padding: 24, textAlign: "center" }}>
          <div style={{ height: 6, marginBottom: 24, borderRadius: 3, background: "repeating-linear-gradient(-55deg,#c99222 0 10px,#bd8619 10px 20px)" }} />
          <h1 style={{ fontSize: 26, margin: "0 0 8px" }}>OpenRAC hit a snag</h1>
          <p style={{ color: "#b4b4bf", margin: "0 0 20px" }}>
            Something went wrong on our side. Try again in a moment.{error.digest ? ` Error code: ${error.digest}` : ""}
          </p>
          <button type="button" onClick={reset} style={{ minHeight: 44, padding: "10px 20px", border: 0, borderRadius: 999, background: "#f5c040", color: "#1a0d00", fontWeight: 600, cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
