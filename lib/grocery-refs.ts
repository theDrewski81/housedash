/**
 * Reference tables for grocery item normalization and quantity conversion.
 */

/** Unicode fraction characters → decimal value */
export const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5,
  "¼": 0.25,
  "¾": 0.75,
  "⅓": 0.333,
  "⅔": 0.667,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
  "⅙": 0.167,
  "⅚": 0.833,
};

/** Unit aliases → canonical form for parsing and matching */
export const UNIT_ALIASES: Record<string, string> = {
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tbsp: "tbsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  tsp: "tsp",
  cup: "cup",
  cups: "cup",
  "fl oz": "fl oz",
  "fluid ounce": "fl oz",
  "fluid ounces": "fl oz",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  can: "can",
  cans: "can",
  package: "package",
  packages: "package",
  clove: "clove",
  cloves: "clove",
  bunch: "bunch",
  bunches: "bunch",
  slice: "slice",
  slices: "slice",
  piece: "piece",
  pieces: "piece",
  pinch: "pinch",
  dash: "dash",
  small: "small",
  medium: "medium",
  large: "large",
};

/** Volume units that convert to fl oz (US) */
const VOLUME_TO_FL_OZ: Record<string, number> = {
  tsp: 1 / 6,
  tbsp: 0.5,
  cup: 8,
  "fl oz": 1,
  ml: 0.033814,
};

/** Weight units that convert to oz */
const WEIGHT_TO_OZ: Record<string, number> = {
  oz: 1,
  lb: 16,
  g: 0.035274,
  kg: 35.274,
};

/** Preparation/state modifiers to strip from item names (comma-delimited or leading) */
export const ITEM_MODIFIERS = new Set([
  "shredded",
  "melted",
  "diced",
  "minced",
  "chopped",
  "sliced",
  "grated",
  "crushed",
  "whipped",
  "softened",
  "room temperature",
  "fresh",
  "frozen",
  "thawed",
  "dried",
  "canned",
  "jarred",
  "bottled",
  "extra virgin",
  "virgin",
  "low fat",
  "fat free",
  "reduced fat",
  "full fat",
  "organic",
  "raw",
  "cooked",
  "toasted",
  "roasted",
  "ground",
  "whole",
  "halved",
  "quartered",
  "cubed",
  "julienned",
  "thinly sliced",
  "roughly chopped",
  "finely chopped",
  "homemade",
  "store-bought",
  "store bought",
  "boneless",
  "skinless",
  "cracked",
  "freshly ground",
  "black",
  "sea",
]);

export function parseUnicodeFraction(s: string): string {
  let out = s;
  // Replace "1 ½" → "1.5" (whole number + fraction)
  for (const [char, val] of Object.entries(UNICODE_FRACTIONS)) {
    out = out.replace(new RegExp(`(\\d+)\\s*${char}`, "g"), (_, n) =>
      String(parseFloat(n) + val)
    );
    out = out.replace(new RegExp(char, "g"), String(val));
  }
  return out;
}

export function normalizeUnit(unit: string): string {
  const key = unit.toLowerCase().trim();
  return UNIT_ALIASES[key] ?? key;
}

/**
 * Strips preparation/state modifiers from item names for matching and display.
 * "cheddar cheese, shredded" → "cheddar cheese"
 * "Whipped Cream Cheese" → "cream cheese"
 */
export function stripItemModifiers(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;

  // Strip parentheticals e.g. "(about 3-4 pieces)"
  let beforeComma = trimmed
    .split(",")[0]
    .trim()
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .trim();
  // Strip leading numbers (handles bad data like "2 garlic clove")
  beforeComma = beforeComma.replace(/^\d+(?:\.\d+)?\s+/, "");

  // Strip leading modifiers (e.g. "whipped cream cheese" → "cream cheese")
  const sortedMods = [...ITEM_MODIFIERS].sort((a, b) => b.length - a.length);
  let result = beforeComma;
  for (const mod of sortedMods) {
    const re = new RegExp(`^\\s*${mod.replace(/\s+/g, "\\s+")}\\s+`, "i");
    if (re.test(result)) {
      result = result.replace(re, "").trim();
    }
  }

  return result || beforeComma;
}

export function convertToSalableUnit(
  value: number,
  unit: string
): { value: number; unit: string } | null {
  const canon = normalizeUnit(unit);
  if (VOLUME_TO_FL_OZ[canon] !== undefined) {
    const flOz = value * VOLUME_TO_FL_OZ[canon];
    return { value: Math.round(flOz * 10) / 10, unit: "fl oz" };
  }
  if (WEIGHT_TO_OZ[canon] !== undefined) {
    const oz = value * WEIGHT_TO_OZ[canon];
    return { value: Math.round(oz * 10) / 10, unit: "oz" };
  }
  return null;
}
