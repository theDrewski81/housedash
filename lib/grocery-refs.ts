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
  // Strip leading "optional:" prefix
  beforeComma = beforeComma.replace(/^optional:\s*/i, "").trim();

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

/** Reference table for items that don't fit keyword patterns. Normalized name → category. Checked before modifier stripping. */
const CATEGORY_REFERENCE: Record<string, string> = {
  "black pepper": "Spices",
  tofu: "Pantry",
  hummus: "Pantry",
  tempeh: "Pantry",
  seitan: "Pantry",
  coffee: "Pantry",
  tea: "Pantry",
  juice: "Pantry",
  soda: "Pantry",
  water: "Pantry",
  wine: "Pantry",
  beer: "Pantry",
  vinegar: "Pantry",
  olive: "Produce",
  olives: "Pantry",
  pickles: "Pantry",
  relish: "Pantry",
  worcestershire: "Pantry",
  "hot sauce": "Pantry",
  sriracha: "Pantry",
  "fish sauce": "Pantry",
  miso: "Pantry",
  nori: "Pantry",
  "rice paper": "Pantry",
  phyllo: "Bakery",
  "pie crust": "Bakery",
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Produce: [
    "garlic", "onion", "tomato", "potato", "carrot", "celery", "lettuce",
    "spinach", "broccoli", "bell pepper", "pepper", "lemon", "lime", "apple", "banana",
    "avocado", "ginger", "herb", "basil", "cilantro", "parsley", "mint",
    "berries", "blueberry", "strawberry", "raspberry", "blackberry", "citrus",
    "orange", "grapefruit", "squash", "zucchini", "cucumber", "kale", "mushroom",
    "corn", "pea", "asparagus", "cabbage", "cauliflower", "radish", "mango",
    "pear", "peach", "plum", "grape",
  ],
  Dairy: [
    "milk", "cream", "cheese", "butter", "yogurt", "sour cream", "egg", "eggs",
  ],
  Meat: [
    "chicken", "beef", "pork", "bacon", "sausage", "turkey", "fish",
    "salmon", "shrimp", "ground beef", "ground turkey", "lamb", "ham",
    "seafood", "tuna", "cod", "tilapia",
  ],
  Bakery: [
    "bread", "breadcrumb", "flour", "tortilla", "pita", "bagel",
    "croissant", "muffin", "roll", "cracker",
  ],
  Pantry: [
    "oil", "vinegar", "soy sauce", "sauce", "broth", "stock", "rice",
    "pasta", "noodle", "bean", "lentil", "canned", "tomato paste", "tomato sauce",
    "sugar", "honey", "maple syrup", "peanut butter", "jam",
    "cereal", "oat", "nut", "almond", "walnut",
    "baking soda", "baking powder", "coconut milk", "coconut oil", "tahini",
    "ketchup", "mustard", "mayonnaise", "salsa", "chip", "cracker",
    "chocolate", "cocoa", "yeast", "cornstarch", "corn starch",
    "quinoa", "couscous", "bulgur",
  ],
  Spices: [
    "black pepper", "red pepper flake", "pepper flake", "bay leaf", "bay leaves",
    "garam masala", "salt", "pepper", "paprika", "cumin", "oregano", "thyme",
    "cinnamon", "nutmeg", "vanilla", "chili", "curry",
    "allspice", "cardamom", "cloves", "turmeric", "sage", "rosemary", "dill",
  ],
  Frozen: [
    "frozen", "ice cream",
  ],
};

/** Flat (keyword, category) pairs sorted by keyword length descending for longest-match-first. */
const CATEGORY_KEYWORD_PAIRS = (() => {
  const pairs: [string, string][] = [];
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      pairs.push([kw, category]);
    }
  }
  return pairs.sort((a, b) => b[0].length - a[0].length);
})();

/**
 * Infers a grocery category from item name (normalized, lowercase).
 * Strips modifiers, checks reference table, then keyword match (longest-first).
 * Returns category string; defaults to "Other" if no match.
 */
export function inferCategory(itemName: string): string {
  const normalized = itemName.toLowerCase().trim();
  if (!normalized) return "Other";

  const refCategory = CATEGORY_REFERENCE[normalized];
  if (refCategory) return refCategory;

  const name = stripItemModifiers(itemName).toLowerCase().trim();
  if (!name) return "Other";

  for (const [kw, category] of CATEGORY_KEYWORD_PAIRS) {
    if (name.includes(kw)) return category;
  }
  return "Other";
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
