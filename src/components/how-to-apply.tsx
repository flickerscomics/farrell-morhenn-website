import { site } from "@/lib/content";

/** In-character application instructions (the static site has no forms). */
export function HowToApply({ role }: { role?: string }) {
  return (
    <div className="card">
      <h2 style={{ fontSize: "1.4rem" }}>How to apply</h2>
      <p>
        Send your application in character to <a href={`mailto:${site.email}`}>{site.email}</a> or by GTA World forum
        private message to the firm{role ? `, with "${role}" in the subject` : ""}. Please include:
      </p>
      <ul className="list-check">
        <li>Your character name and in-character contact details</li>
        <li>The role you are applying for</li>
        <li>Relevant in-character experience</li>
        <li>Your usual availability (Pacific Time)</li>
        <li>A short statement on why you would like to join the firm</li>
      </ul>
      <p className="small muted" style={{ marginBottom: 0 }}>
        Applications are in character only. Do not include real-world personal information.
      </p>
    </div>
  );
}
