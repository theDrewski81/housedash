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

type QuantityPart =
  | { kind: "single"; value: number; unit: string }
  | { kind: "range"; min: number; max: number; unit: string };

function parseNum(s: string): number {
  if (s.includes("/")) {
    const [n, d] = s.split("/").map(Number);
    return d ? n / d : n;
  }
  return parseFloat(s);
}

/**
 * Parses a single quantity part: "1.5 cup", "8 ounce", "1-2 cloves", "0.5 – 0.75 tsp".
 */
function parseQuantityPart(q: string): QuantityPart | null {
  const normalized = parseUnicodeFraction(q.trim());
  if (!normalized) return null;

  // Range: "1-2", "0.5 – 0.75 tsp"
  const rangeMatch = normalized.match(
    new RegExp(
      `^(\\d+(?:\\.\\d+)?(?:\\/\\d+)?)\\s*[-–]\\s*(\\d+(?:\\.\\d+)?(?:\\/\\d+)?)\\s*(${UNIT_PATTERN})?\\s*$`,
      "i"
    )
  );
  if (rangeMatch) {
    const min = parseNum(rangeMatch[1]);
    const max = parseNum(rangeMatch[2]);
    if (!Number.isNaN(min) && !Number.isNaN(max))
      return {
        kind: "range",
        min,
        max,
        unit: normalizeUnit(rangeMatch[3] ?? ""),
      };
  }

  // Single value
  const match = normalized.match(
    new RegExp(`^(\\d+(?:\\.\\d+)?(?:\\/\\d+)?)\\s*(${UNIT_PATTERN})?\\s*$`, "i")
  );
  if (!match) return null;
  const value = parseNum(match[1]);
  if (Number.isNaN(value)) return null;
  return {
    kind: "single",
    value,
    unit: normalizeUnit(match[2] ?? ""),
  };
}

function parseQuantityParts(q: string): QuantityPart[] {
  const parts = q.split(/\s*\+\s*/).map((p) => parseQuantityPart(p.trim()));
  return parts.filter((p): p is QuantityPart => p !== null);
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

  const allParts = [...existingParts, ...addedParts];

  // Collect by unit: volume (fl oz), weight (oz), other. Track ranges and singles.
  const volumeRanges: { min: number; max: number }[] = [];
  const volumeSingles: number[] = [];
  const weightRanges: { min: number; max: number }[] = [];
  const weightSingles: number[] = [];
  const rangesByUnit = new Map<string, { min: number; max: number }[]>();
  const singlesByUnit = new Map<string, number[]>();

  for (const p of allParts) {
    if (p.kind === "range") {
      const salableMin = convertToSalableUnit(p.min, p.unit);
      const salableMax = convertToSalableUnit(p.max, p.unit);
      if (salableMin && salableMax && salableMin.unit === salableMax.unit) {
        if (salableMin.unit === "fl oz") {
          volumeRanges.push({ min: salableMin.value, max: salableMax.value });
        } else if (salableMin.unit === "oz") {
          weightRanges.push({ min: salableMin.value, max: salableMax.value });
        } else {
          const key = salableMin.unit || "count";
          const arr = rangesByUnit.get(key) ?? [];
          arr.push({ min: salableMin.value, max: salableMax.value });
          rangesByUnit.set(key, arr);
        }
      } else {
        const key = p.unit || "count";
        const arr = rangesByUnit.get(key) ?? [];
        arr.push({ min: p.min, max: p.max });
        rangesByUnit.set(key, arr);
      }
    } else {
      const salable = convertToSalableUnit(p.value, p.unit);
      if (salable) {
        if (salable.unit === "fl oz") volumeSingles.push(salable.value);
        else if (salable.unit === "oz") weightSingles.push(salable.value);
        else {
          const key = salable.unit || "count";
          const arr = singlesByUnit.get(key) ?? [];
          arr.push(salable.value);
          singlesByUnit.set(key, arr);
        }
      } else {
        const key = p.unit || "count";
        const arr = singlesByUnit.get(key) ?? [];
        arr.push(p.value);
        singlesByUnit.set(key, arr);
      }
    }
  }

  const result: string[] = [];

  const addToResult = (
    ranges: { min: number; max: number }[],
    singles: number[],
    unit: string
  ) => {
    const add = singles.reduce((a, b) => a + b, 0);
    const totalMin = ranges.reduce((a, r) => a + r.min, 0) + add;
    const totalMax = ranges.reduce((a, r) => a + r.max, 0) + add;
    const unitStr = unit ? ` ${unit}` : "";
    if (totalMin === totalMax) {
      result.push(`${Math.round(totalMin * 10) / 10}${unitStr}`.trim());
    } else {
      result.push(
        `${Math.round(totalMin * 10) / 10}-${Math.round(totalMax * 10) / 10}${unitStr}`.trim()
      );
    }
  };

  if (volumeRanges.length > 0 || volumeSingles.length > 0) {
    addToResult(volumeRanges, volumeSingles, "fl oz");
  }
  if (weightRanges.length > 0 || weightSingles.length > 0) {
    addToResult(weightRanges, weightSingles, "oz");
  }

  // Merge ranges + singles by unit
  for (const [unit, ranges] of rangesByUnit) {
    const singles = singlesByUnit.get(unit) ?? [];
    const add = singles.reduce((a, b) => a + b, 0);
    const totalMin = ranges.reduce((a, r) => a + r.min, 0) + add;
    const totalMax = ranges.reduce((a, r) => a + r.max, 0) + add;
    const unitStr = unit ? ` ${unit}` : "";
    if (totalMin === totalMax) {
      result.push(`${Math.round(totalMin * 10) / 10}${unitStr}`.trim());
    } else {
      result.push(
        `${Math.round(totalMin * 10) / 10}-${Math.round(totalMax * 10) / 10}${unitStr}`.trim()
      );
    }
    singlesByUnit.delete(unit);
  }

  for (const [unit, vals] of singlesByUnit) {
    const sum = vals.reduce((a, b) => a + b, 0);
    result.push(unit ? `${Math.round(sum * 10) / 10} ${unit}` : String(sum));
  }

  return result.length > 0 ? result.join(" + ") : `${existing} + ${added}`.trim();
}
