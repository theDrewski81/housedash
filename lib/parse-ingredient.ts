import { stripItemModifiers, parseUnicodeFraction } from "@/lib/grocery-refs";

/**
 * Parses an ingredient line into a purchasable item name and quantity.
 * Example: "1 cup ranch dressing, homemade or store-bought" → { item: "ranch dressing", quantity: "1 cup" }
 * Modifiers like ", shredded" or "Whipped" are stripped: "cheddar cheese, shredded" → "cheddar cheese"
 */
export function parseIngredientLine(line: string): {
  item: string;
  quantity: string | null;
} {
  const trimmed = line.trim();
  if (!trimmed) {
    return { item: "", quantity: null };
  }

  // Normalize unicode fractions (½→0.5) for quantity parsing
  const normalized = parseUnicodeFraction(trimmed);

  // Match optional leading quantity: number (including fractions like 1/2, ½) + optional unit
  const quantityMatch = normalized.match(
    /^(\d+(?:\.\d+)?(?:\/\d+)?(?:\s*-\s*\d+(?:\.\d+)?(?:\/\d+)?)?)\s*(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|lb|lbs|oz|g|kg|ml|can|cans|package|packages|clove|cloves|bunch|bunches|slice|slices|piece|pieces|pinch|dash|small|medium|large)?\s+(.+)$/i
  );

  if (quantityMatch) {
    const [, numPart, unit, rest] = quantityMatch;
    const quantity = unit ? `${numPart.trim()} ${unit}`.trim() : numPart.trim();
    const item = stripItemModifiers(cleanItemName(rest));
    return { item, quantity: quantity || null };
  }

  // No quantity pattern: entire line is the item
  return { item: stripItemModifiers(cleanItemName(trimmed)), quantity: null };
}

/** Strip trailing descriptive clauses (e.g. ", homemade or store-bought", ", to taste") */
function cleanItemName(s: string): string {
  const commaModifiers =
    /,\s*(homemade\s+or\s+store-bought|to\s+taste|optional|divided|for\s+garnish|room\s+temperature).*$/i;
  const trailingModifiers = /\s+(to\s+taste|optional|divided|for\s+garnish)$/i;
  return s
    .replace(commaModifiers, "")
    .replace(trailingModifiers, "")
    .replace(/\s*,\s*$/, "")
    .trim();
}

/**
 * Parses multi-line ingredients text into array of { item, quantity }.
 * Skips empty lines.
 */
export function parseIngredientsText(text: string): Array<{ item: string; quantity: string | null }> {
  return text
    .split(/\r?\n/)
    .map((line) => parseIngredientLine(line))
    .filter((p) => p.item.length > 0);
}
