// Engraving-style illustration of a courthouse facade against the Los Santos
// skyline. Pure SVG, so it renders reliably without external images.

const line = "rgb(255 255 255 / 0.2)";
const lineStrong = "rgb(255 255 255 / 0.6)";

const skyline: [number, number, number, number][] = [
  // x, y(top), width, height-to-baseline
  [20, 250, 44, 120],
  [70, 210, 36, 160],
  [112, 168, 30, 202],
  [150, 232, 52, 138],
  [356, 196, 40, 174],
  [402, 120, 44, 250],
  [452, 220, 36, 150],
  [494, 182, 46, 188],
];

export function HeroArt() {
  return (
    <svg viewBox="0 0 560 420" role="img" aria-label="Illustration of a courthouse in front of the Los Santos skyline" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="win" width="8" height="10" patternUnits="userSpaceOnUse">
          <rect x="2" y="2" width="3" height="4" fill="rgb(255 255 255 / 0.13)" />
        </pattern>
      </defs>

      {/* Setting sun */}
      <circle cx="300" cy="190" r="118" fill="var(--gold)" fillOpacity="0.07" stroke="var(--gold)" strokeOpacity="0.55" strokeWidth="1" />
      <circle cx="300" cy="190" r="140" fill="none" stroke="var(--gold)" strokeOpacity="0.18" strokeWidth="1" />

      {/* Skyline */}
      {skyline.map(([x, y, w, h], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={h} fill="url(#win)" stroke={line} strokeWidth="1" />
        </g>
      ))}
      {/* Tower with angled crown */}
      <path d="M232 370 V96 L262 74 L292 96 V370" fill="url(#win)" stroke={line} />
      <path d="M262 74 V52" stroke={line} />
      <path d="M318 370 V150 H344 V370" fill="url(#win)" stroke={line} />

      {/* Horizon */}
      <line x1="0" y1="370.5" x2="560" y2="370.5" stroke="var(--gold)" strokeOpacity="0.7" />

      {/* Courthouse */}
      <g stroke={lineStrong} strokeWidth="1.1" fill="var(--navy)">
        <path d="M150 232 L280 176 L410 232 Z" />
        <path d="M176 226 L280 184 L384 226" fill="none" stroke="var(--gold)" strokeOpacity="0.8" />
        <rect x="150" y="232" width="260" height="14" />
        <rect x="156" y="246" width="248" height="8" />
        {[170, 206, 242, 278, 314, 350, 386].map((x) => (
          <g key={x}>
            <rect x={x - 7} y="254" width="14" height="88" />
            <line x1={x - 2.5} y1="258" x2={x - 2.5} y2="338" stroke="rgb(255 255 255 / 0.25)" />
            <line x1={x + 2.5} y1="258" x2={x + 2.5} y2="338" stroke="rgb(255 255 255 / 0.25)" />
            <rect x={x - 9} y="250" width="18" height="5" />
            <rect x={x - 9} y="341" width="18" height="5" />
          </g>
        ))}
        <rect x="140" y="346" width="280" height="8" />
        <rect x="128" y="354" width="304" height="8" />
        <rect x="116" y="362" width="328" height="8" />
      </g>
      <circle cx="280" cy="214" r="9" fill="none" stroke="var(--gold)" strokeOpacity="0.9" />

      {/* Reflection lines */}
      {[384, 396, 406].map((y, i) => (
        <line key={y} x1={60 + i * 40} y1={y} x2={500 - i * 40} y2={y} stroke="rgb(255 255 255 / 0.08)" />
      ))}
    </svg>
  );
}
