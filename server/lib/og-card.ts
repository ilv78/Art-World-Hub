import sharp from "sharp";

const WIDTH = 1200;
const HEIGHT = 630;

// Vernis9 brand orange (matches client/src/index.css primary, CLAUDE.md spec).
const BRAND_PRIMARY = "#F97316";

export interface OgCardInput {
  /**
   * Absolute filesystem path to the source image. When null/undefined the
   * card renders a solid brand-color background instead.
   */
  sourceImagePath?: string | null;
  /**
   * Card title — line-wrapped to at most two lines and truncated with an
   * ellipsis when it overflows.
   */
  title: string;
  /**
   * Optional second line of meta text under the title (e.g. artist name,
   * curator name, "by {artist}"). Single line, truncated with ellipsis.
   */
  subtitle?: string;
}

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}

/**
 * Naive line-wrap: breaks `text` into at most `maxLines` lines that each fit
 * roughly `maxChars` characters. Last line is truncated with an ellipsis when
 * the remaining text doesn't fit. Words longer than maxChars are hard-cut.
 *
 * SVG `<text>` doesn't auto-wrap, so we have to compute lines ourselves. The
 * char-count heuristic is approximate (Playfair is variable-width) but for
 * 64px display text on a 720px-wide column it produces visually balanced
 * results across the title lengths we actually have.
 */
function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (lines.length === maxLines) {
      const last = lines[maxLines - 1];
      lines[maxLines - 1] = `${last.slice(0, Math.max(0, maxChars - 1))}…`;
      return lines;
    }
    if (word.length > maxChars) {
      current = `${word.slice(0, maxChars - 1)}…`;
    } else {
      current = word;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length > maxLines) {
    const last = lines[maxLines - 1];
    return [
      ...lines.slice(0, maxLines - 1),
      `${last.slice(0, Math.max(0, maxChars - 1))}…`,
    ];
  }
  return lines;
}

/**
 * Full Vernis9 brand mark — diamond + V icon + "vernis9.art" wordmark.
 * Mirrors the in-app `<Vernis9Logo showWordmark />` (260×60 viewBox). Strokes
 * forced to white (the in-app version uses currentColor, which is meaningless
 * in a standalone SVG passed to sharp). Brand-orange accent on vertex dots
 * and the ".art" italic suffix.
 *
 * Inlined rather than read from disk: file is tiny, version-locked to this
 * card design, and avoiding I/O on cold renders keeps the route simple.
 */
const LOGO_SVG_INNER = `
  <path d="M30 4 L56 30 L30 56 L4 30 Z" fill="none" stroke="#ffffff" stroke-width="1.2"/>
  <path d="M17 18 L30 44 L43 18" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="30" cy="4" r="2.2" fill="${BRAND_PRIMARY}"/>
  <circle cx="56" cy="30" r="2.2" fill="${BRAND_PRIMARY}"/>
  <circle cx="30" cy="56" r="2.2" fill="${BRAND_PRIMARY}"/>
  <circle cx="4" cy="30" r="2.2" fill="${BRAND_PRIMARY}"/>
  <text x="68" y="40" font-family="Playfair Display, serif" font-weight="400" font-size="34" letter-spacing="1" fill="#ffffff">vernis9</text>
  <text x="200" y="40" font-family="Playfair Display, serif" font-style="italic" font-size="20" letter-spacing="3" fill="${BRAND_PRIMARY}">.art</text>
`;

function buildOverlaySvg(title: string, subtitle: string | undefined, hasSource: boolean): Buffer {
  const titleLines = wrapText(title, 22, 2);
  const subtitleLine = subtitle ? wrapText(subtitle, 40, 1)[0] ?? "" : "";

  // Layout: title block in the upper-middle, brand footer (orange divider +
  // logo + "vernis9.art" wordmark) at the bottom. Title startY is tuned so
  // the longest 2-line + subtitle case still clears the divider.
  const titleX = 60;
  const titleStartY = subtitleLine ? 280 : 320;
  const titleLineHeight = 78;
  const titleTspans = titleLines
    .map((line, i) => {
      const y = titleStartY + i * titleLineHeight;
      return `<tspan x="${titleX}" y="${y}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  const subtitleY = titleStartY + titleLines.length * titleLineHeight + 12;
  const subtitleEl = subtitleLine
    ? `<text x="${titleX}" y="${subtitleY}" font-family="Inter, sans-serif" font-size="28" fill="#ffffff" fill-opacity="0.82">${escapeXml(subtitleLine)}</text>`
    : "";

  // Bottom brand footer — full-width brand-orange divider with the logo +
  // "vernis9.art" wordmark sitting beneath it. Mirrors the in-app brand
  // treatment (orange accent + Vernis9Logo). Logo viewBox is 260×60; 1.5×
  // scale → 390×90 effective, anchored at (60, dividerY + gap).
  const dividerY = HEIGHT - 116;
  const logoY = dividerY + 16;
  const dividerLine = `<rect x="0" y="${dividerY}" width="${WIDTH}" height="4" fill="${BRAND_PRIMARY}"/>`;
  const logoMark = `<g transform="translate(60 ${logoY}) scale(1.5)">${LOGO_SVG_INNER}</g>`;

  // NB: librsvg requires stop-color + stop-opacity as SEPARATE attributes —
  // rgba() in stop-color silently renders as fully opaque black and hides the
  // background image. Same applies to fill on the wordmark backdrop below.
  //
  // Darken layers only fire when there's a real source image to legibility-
  // protect against. The no-source brand background (buildBackgroundBuffer)
  // is already designed for text contrast; piling darkening on top would
  // mute the brand-orange glow we baked in.
  const darkenRect = hasSource
    ? `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#darken)"/>`
    : "";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="darken" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.62"/>
    </linearGradient>
  </defs>
  ${darkenRect}
  <text font-family="Playfair Display, serif" font-weight="700" font-size="72" fill="#ffffff">
    ${titleTspans}
  </text>
  ${subtitleEl}
  ${dividerLine}
  ${logoMark}
</svg>`;
  return Buffer.from(svg);
}

async function buildBackgroundBuffer(sourceImagePath?: string | null): Promise<Buffer> {
  if (!sourceImagePath) {
    // No source asset (artist with no avatar, artwork hosted on an external
    // URL we won't fetch, etc.) — render a branded fallback: dark base with
    // a soft brand-orange radial glow in the top-right and a faint diagonal
    // band. Looks intentional, not "image failed to load".
    const brandSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <radialGradient id="glow" cx="82%" cy="22%" r="62%">
      <stop offset="0%" stop-color="${BRAND_PRIMARY}" stop-opacity="0.55"/>
      <stop offset="55%" stop-color="${BRAND_PRIMARY}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#18181b" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="band" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="${BRAND_PRIMARY}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${BRAND_PRIMARY}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${BRAND_PRIMARY}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#18181b"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
  <polygon points="0,${HEIGHT} ${WIDTH},${HEIGHT - 320} ${WIDTH},${HEIGHT - 280} 0,${HEIGHT - 40}" fill="url(#band)"/>
</svg>`;
    return sharp(Buffer.from(brandSvg)).jpeg().toBuffer();
  }
  // Brightness 0.85 leaves the image visibly present rather than crushed to
  // near-black; the SVG `darken` gradient on top still legibility-protects
  // the title text. Tuned together (gradient was lowered in lockstep).
  return sharp(sourceImagePath)
    .resize(WIDTH, HEIGHT, { fit: "cover", position: "attention" })
    .blur(20)
    .modulate({ brightness: 0.85 })
    .jpeg()
    .toBuffer();
}

/**
 * Composes a 1200x630 branded JPEG OG card. The result is suitable for use as
 * `og:image` / `twitter:image`. Caller is responsible for caching the buffer
 * to disk and serving with appropriate Cache-Control headers.
 *
 * Throws on unreadable source image so the route handler can fall back to
 * the static og-default.png.
 */
export async function composeOgCard(input: OgCardInput): Promise<Buffer> {
  const hasSource = !!input.sourceImagePath;
  const background = await buildBackgroundBuffer(input.sourceImagePath);
  const overlay = buildOverlaySvg(input.title, input.subtitle, hasSource);
  return sharp(background)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}

export const __testing = { wrapText, buildOverlaySvg, WIDTH, HEIGHT };
