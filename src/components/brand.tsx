import Link from "next/link";

export function BrandMark({ className = "brand-mark", initials = "FM" }: { className?: string; initials?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <rect x="0.5" y="0.5" width="47" height="47" fill="var(--navy)" />
      <rect x="4" y="4" width="40" height="40" fill="none" stroke="var(--gold)" strokeWidth="0.9" />
      <text
        x="24"
        y="30.5"
        textAnchor="middle"
        fill="#fff"
        fontFamily="var(--font-serif), Georgia, serif"
        fontSize="17"
        fontWeight="600"
        letterSpacing="0.5"
      >
        {initials}
      </text>
      <line x1="15" y1="35.5" x2="33" y2="35.5" stroke="var(--gold)" strokeWidth="0.9" />
    </svg>
  );
}

function initialsOf(name: string) {
  const words = name.replace(/\b(LLP|LLC|PC|P\.C\.|and)\b|&/gi, " ").split(/[\s-]+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function Brand({
  firmName,
  shortName,
  logoUrl,
  sub = "Attorneys at Law",
}: {
  firmName: string;
  shortName: string;
  logoUrl: string | null;
  sub?: string;
}) {
  return (
    <Link href="/" className="brand" aria-label={`${firmName} — home`}>
      {logoUrl ? (
        <img src={logoUrl} alt="" className="brand-logo-img" width={56} height={56} />
      ) : (
        <BrandMark initials={initialsOf(shortName || firmName)} />
      )}
      <span className="brand-text">
        <span className="brand-name">{shortName || firmName}</span>
        <span className="brand-sub">{sub}</span>
      </span>
    </Link>
  );
}
