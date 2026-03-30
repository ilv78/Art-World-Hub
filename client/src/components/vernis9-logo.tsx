interface Vernis9LogoProps {
  accent?: string;
  height?: number;
  className?: string;
  showWordmark?: boolean;
}

export function Vernis9Logo({
  accent = "#F97316",
  height = 32,
  className,
  showWordmark = true,
}: Vernis9LogoProps) {
  // The SVG viewBox is 200x60 for full wordmark, 60x60 for icon-only
  const viewBox = showWordmark ? "0 0 260 60" : "0 0 60 60";
  const aspectRatio = showWordmark ? 260 / 60 : 1;
  const width = height * aspectRatio;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={width}
      height={height}
      className={className}
      aria-label="Vernis9 logo"
      role="img"
    >
      {/* Diamond frame — uses currentColor for light/dark mode */}
      <path
        d="M30 4 L56 30 L30 56 L4 30 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      {/* V mark */}
      <path
        d="M17 18 L30 44 L43 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Accent dots at diamond vertices */}
      <circle cx="30" cy="4" r="2.2" fill={accent} />
      <circle cx="56" cy="30" r="2.2" fill={accent} />
      <circle cx="30" cy="56" r="2.2" fill={accent} />
      <circle cx="4" cy="30" r="2.2" fill={accent} />

      {showWordmark && (
        <>
          {/* Wordmark: vernis9 — uses currentColor */}
          <text
            x="68"
            y="40"
            fontFamily="'Playfair Display', Georgia, serif"
            fontSize="34"
            fontWeight="400"
            letterSpacing="0.03em"
            fill="currentColor"
          >
            vernis9
          </text>
          {/* .art suffix — accent color, italic */}
          <text
            x="200"
            y="40"
            fontFamily="'Playfair Display', Georgia, serif"
            fontSize="20"
            fontStyle="italic"
            letterSpacing="0.15em"
            fill={accent}
          >
            .art
          </text>
        </>
      )}
    </svg>
  );
}
