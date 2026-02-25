/**
 * Grocery deduplication: match similar items and merge quantities.
 */

function normalizeItemName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Returns true if the two item names refer to the same purchasable item.
 * E.g. "cheddar" matches "cheddar cheese", "ranch dressing" matches "ranch dressing".
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
 * Returns the more specific item name when merging.
 */
export function chooseItemName(existing: string, added: string): string {
  const na = normalizeItemName(existing);
  const nb = normalizeItemName(added);
  return na.length >= nb.length ? existing : added;
}

/**
 * Parses a quantity string like "1.5 cup" or "1/2 tbsp" into { value, unit }.
 */
function parseQuantity(q: string): { value: number; unit: string } | null {
  const trimmed = q.trim();
  if (!trimmed) return null;
  const match = trimmed.match(
    /^(\d+(?:\.\d+)?(?:\/\d+)?)\s*(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|lb|lbs|oz|g|kg|ml|can|cans|package|packages|clove|cloves|bunch|bunches|slice|slices|piece|pieces|pinch|dash|small|medium|large)?\s*$/i
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
  const unit = (match[2] ?? "").toLowerCase();
  return { value, unit };
}

/**
 * Merges two quantity strings. When units match, adds values.
 * When units differ or one has no unit, concatenates with " + ".
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
    const unitPart = parsedExisting.unit ? ` ${parsedExisting.unit}` : "";
    return `${sum}${unitPart}`.trim();
  }

  return `${existing} + ${added}`.trim();
}
