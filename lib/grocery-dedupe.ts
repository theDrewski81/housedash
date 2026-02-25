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

/**
 * Returns true if the two item names refer to the same purchasable item.
 * Modifiers are stripped: "cheddar cheese, shredded" matches "cheddar cheese, melted".
 */
export function itemsMatch(a: string, b: string): boolean {
  const na = normalizeItemName(a);
  const nb = normalizeItemName(b);
  if (na === nb) return true;
  const wordsA = na.split(/\s+/).filter(Boolean);
  const wordsB = nb.split(/\s+/).filter(Boolean);
  const shorter = wordsA.length <= wordsB.length ? wordsA : wordsB;
  const longer = wordsA.length > wordsB.length ? wordsA : wordsB;
  return shorter.every((w) => longer.includes(w));
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
  "cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|lb|lbs|oz|g|kg|ml|can|cans|package|packages|clove|cloves|bunch|bunches|slice|slices|piece|pieces|pinch|dash|small|medium|large|fl oz|fluid ounce|fluid ounces";

/**
 * Parses a quantity string like "1.5 cup", "½ tbsp", or "1/2 cup" into { value, unit }.
 * Handles unicode fractions (½→0.5) and normalizes units.
 */
function parseQuantity(q: string): { value: number; unit: string } | null {
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
 * Merges two quantity strings. When units are compatible (same type), adds values
 * and converts to salable unit (e.g. 19 tbsp → 9.5 fl oz).
 * When incompatible, concatenates with " + ".
 */
export function mergeQuantity(
  existing: string | null,
  added: string | null
): string | null {
  if (!added?.trim()) return existing;
  if (!existing?.trim()) return added;

  const parsedExisting = parseQuantity(existing);
  const parsedAdded = parseQuantity(added);

  if (parsedExisting && parsedAdded && parsedExisting.unit === parsedAdded.unit) {
    const sum = parsedExisting.value + parsedAdded.value;
    const salable = convertToSalableUnit(sum, parsedExisting.unit);
    if (salable) {
      return `${salable.value} ${salable.unit}`;
    }
    const unitPart = parsedExisting.unit ? ` ${parsedExisting.unit}` : "";
    return `${sum}${unitPart}`.trim();
  }

  // Try converting both to salable and adding (e.g. tbsp + cup → fl oz)
  if (parsedExisting && parsedAdded) {
    const salableA = convertToSalableUnit(parsedExisting.value, parsedExisting.unit);
    const salableB = convertToSalableUnit(parsedAdded.value, parsedAdded.unit);
    if (salableA && salableB && salableA.unit === salableB.unit) {
      const sum = salableA.value + salableB.value;
      return `${Math.round(sum * 10) / 10} ${salableA.unit}`;
    }
  }

  return `${existing} + ${added}`.trim();
}
