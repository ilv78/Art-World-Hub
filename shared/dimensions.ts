// Parsing of the free-text `artworks.dimensions` string into structured
// physical size for the AR "View in my room" feature (#634).
//
// The legacy `dimensions` column is free-form (e.g. "60 x 80", "30x40",
// "30 x 21 ", "200 x 100"). AR needs numeric width/height in a known unit to
// place an artwork at believable scale, so we parse what we can and leave the
// rest null for the artist to fill in via the dashboard.

export type DimensionUnit = "cm" | "mm" | "in";

export interface ParsedDimensions {
  widthCm: number;
  heightCm: number;
  unit: DimensionUnit;
}

const UNIT_TO_CM: Record<DimensionUnit, number> = {
  cm: 1,
  mm: 0.1,
  in: 2.54,
};

// Matches "<num> [x|×|X|*|by] <num>" with optional surrounding whitespace and
// an optional trailing unit token. Decimals and comma-decimals are allowed.
const DIMENSION_RE =
  /^\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:x|×|X|\*|by)\s*([0-9]+(?:[.,][0-9]+)?)\s*(cm|mm|in|inch|inches|"|”)?\s*$/i;

function toNumber(raw: string): number {
  return parseFloat(raw.replace(",", "."));
}

function normalizeUnit(raw: string | undefined): DimensionUnit {
  if (!raw) return "cm";
  const u = raw.toLowerCase();
  if (u === "mm") return "mm";
  if (u === "in" || u === "inch" || u === "inches" || u === '"' || u === "”") return "in";
  return "cm";
}

/**
 * Parse a free-text dimensions string into structured cm width/height.
 * Returns null when the string can't be confidently parsed (so the artist is
 * prompted to enter dimensions manually rather than us guessing wrong).
 *
 * Convention: the first number is width, the second is height (W x H), matching
 * how the gallery components already read "60 x 80".
 */
export function parseDimensions(input: string | null | undefined): ParsedDimensions | null {
  if (!input) return null;
  const m = DIMENSION_RE.exec(input);
  if (!m) return null;

  const rawW = toNumber(m[1]);
  const rawH = toNumber(m[2]);
  if (!Number.isFinite(rawW) || !Number.isFinite(rawH) || rawW <= 0 || rawH <= 0) {
    return null;
  }

  const unit = normalizeUnit(m[3]);
  const factor = UNIT_TO_CM[unit];
  // Round to 2 decimals to fit numeric(7,2) and avoid float noise.
  const round2 = (n: number) => Math.round(n * factor * 100) / 100;

  return { widthCm: round2(rawW), heightCm: round2(rawH), unit };
}
