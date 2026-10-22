import { site } from "@/lib/content";

/** Application instructions for vacancies (the site has no online forms). */
export function HowToApply({ role }: { role?: string }) {
  return (
    <div className="card">
      <h2 style={{ fontSize: "1.4rem" }}>How to apply</h2>
      <p>
        Email your application to <a href={`mailto:${site.email}`}>{site.email}</a>
        {role ? ` with "${role}" in the subject line` : ""}, or hand it in at reception. Please include:
      </p>
      <ul className="list-check">
        <li>Your full name and contact details</li>
        <li>The role you are applying for</li>
        <li>Your relevant experience</li>
        <li>When you are available to work</li>
        <li>A short statement on why you would like to join the firm</li>
      </ul>
      <p className="small muted" style={{ marginBottom: 0 }}>
        Every application is reviewed by a partner and receives a reply.
      </p>
    </div>
  );
}
