/**
 * Grocery deduplication: match similar items and merge quantities.
 */

import {
  stripItemModifiers,
  parseUnicodeFraction,
  normalizeUnit,
  convertToSalableUnit,
} from "@/lib/grocery-refs";

function normalizeItemName(name: string): string {
  return stripItemModifiers(name).toLowerCase().trim().replace(/\s+/g, " ");
}

/** Normalize word for matching (handles plural: breast/breasts, clove/cloves) */
function wordMatches(w1: string, w2: string): boolean {
  if (w1 === w2) return true;
  if (w1.length > 1 && w2 === w1 + "s") return true;
  if (w2.length > 1 && w1 === w2 + "s") return true;
  return false;
}

/**
 * Returns true if the two item names refer to the same purchasable item.
 * Modifiers are stripped; plurals match: "chicken breast" matches "chicken breasts".
 */
export function itemsMatch(a: string, b: string): boolean {
  const na = normalizeItemName(a);
  const nb = normalizeItemName(b);
  if (na === nb) return true;
  const wordsA = na.split(/\s+/).filter(Boolean);
  const wordsB = nb.split(/\s+/).filter(Boolean);
  const shorter = wordsA.length <= wordsB.length ? wordsA : wordsB;
  const longer = wordsA.length > wordsB.length ? wordsA : wordsB;
  return shorter.every((sw) =>
    longer.some((lw) => wordMatches(sw, lw))
  );
}

/**
 * Returns the core item name (modifiers stripped) for display.
 */
export function chooseItemName(existing: string, added: string): string {
  const coreExisting = stripItemModifiers(existing).trim();
  const coreAdded = stripItemModifiers(added).trim();
  return coreExisting.length >= coreAdded.length ? coreExisting : coreAdded;
}

/** Unit names for regex (from grocery-refs) */
const UNIT_PATTERN =
  "cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|lb|lbs|oz|ounce|ounces|g|kg|ml|can|cans|package|packages|clove|cloves|bunch|bunches|slice|slices|piece|pieces|pinch|dash|small|medium|large|fl oz|fluid ounce|fluid ounces";

/**
 * Parses a single quantity part like "1.5 cup" or "8 ounce" into { value, unit }.
 */
function parseQuantityPart(q: string): { value: number; unit: string } | null {
  const normalized = parseUnicodeFraction(q.trim());
  if (!normalized) return null;
  const match = normalized.match(
    new RegExp(`^(\\d+(?:\\.\\d+)?(?:\\/\\d+)?)\\s*(${UNIT_PATTERN})?\\s*$`, "i")
  );
  if (!match) return null;
  let value: number;
  const numStr = match[1];
  if (numStr.includes("/")) {
    const [n, d] = numStr.split("/").map(Number);
    value = d ? n / d : n;
  } else {
    value = parseFloat(numStr);
  }
  if (Number.isNaN(value)) return null;
  const unit = normalizeUnit(match[2] ?? "");
  return { value, unit };
}

/**
 * Parses a quantity string that may contain multiple parts separated by " + ".
 * Returns array of { value, unit }.
 */
function parseQuantityParts(q: string): Array<{ value: number; unit: string }> {
  const parts = q.split(/\s*\+\s*/).map((p) => parseQuantityPart(p.trim()));
  return parts.filter((p): p is { value: number; unit: string } => p !== null);
}

/**
 * Merges two quantity strings. When units are compatible (same type), adds values
 * and converts to salable unit. Handles multi-part quantities like "8 ounce + 1.5 cups".
 */
export function mergeQuantity(
  existing: string | null,
  added: string | null
): string | null {
  if (!added?.trim()) return existing;
  if (!existing?.trim()) return added;

  const existingParts = parseQuantityParts(existing);
  const addedParts = parseQuantityParts(added);

  if (existingParts.length === 0 && addedParts.length === 0) {
    return `${existing} + ${added}`.trim();
  }

  // Collect all parts and convert to salable units
  const volumeByFlOz: number[] = [];
  const weightByOz: number[] = [];
  const other: Array<{ value: number; unit: string }> = [];

  for (const p of [...existingParts, ...addedParts]) {
    const salable = convertToSalableUnit(p.value, p.unit);
    if (salable) {
      if (salable.unit === "fl oz") volumeByFlOz.push(salable.value);
      else if (salable.unit === "oz") weightByOz.push(salable.value);
      else other.push(salable);
    } else {
      other.push(p);
    }
  }

  const result: string[] = [];
  if (volumeByFlOz.length > 0) {
    const sum = volumeByFlOz.reduce((a, b) => a + b, 0);
    result.push(`${Math.round(sum * 10) / 10} fl oz`);
  }
  if (weightByOz.length > 0) {
    const sum = weightByOz.reduce((a, b) => a + b, 0);
    result.push(`${Math.round(sum * 10) / 10} oz`);
  }
  // Non-convertible units: sum same units, else keep as-is
  const otherByUnit = new Map<string, number>();
  for (const p of other) {
    const key = p.unit || "count";
    otherByUnit.set(key, (otherByUnit.get(key) ?? 0) + p.value);
  }
  for (const [unit, sum] of otherByUnit) {
    result.push(unit ? `${Math.round(sum * 10) / 10} ${unit}` : String(sum));
  }

  return result.length > 0 ? result.join(" + ") : `${existing} + ${added}`.trim();
}
