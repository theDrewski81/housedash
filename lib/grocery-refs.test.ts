import { describe, it, expect } from "vitest";
import { inferCategory } from "./grocery-refs";

describe("inferCategory", () => {
  describe("modifier stripping", () => {
    it('"fresh basil" → Produce', () => {
      expect(inferCategory("fresh basil")).toBe("Produce");
    });
    it('"diced tomatoes" → Produce', () => {
      expect(inferCategory("diced tomatoes")).toBe("Produce");
    });
    it('"whipped cream cheese" → Dairy', () => {
      expect(inferCategory("whipped cream cheese")).toBe("Dairy");
    });
  });

  describe("ambiguity resolution (longest-keyword-first)", () => {
    it('"ice cream" → Frozen (not Dairy)', () => {
      expect(inferCategory("ice cream")).toBe("Frozen");
    });
    it('"black pepper" → Spices (not Produce)', () => {
      expect(inferCategory("black pepper")).toBe("Spices");
    });
    it('"nutmeg" → Spices (not Pantry)', () => {
      expect(inferCategory("nutmeg")).toBe("Spices");
    });
  });

  describe("expanded keywords", () => {
    it('"eggs" → Dairy', () => {
      expect(inferCategory("eggs")).toBe("Dairy");
    });
    it('"zucchini" → Produce', () => {
      expect(inferCategory("zucchini")).toBe("Produce");
    });
    it('"tahini" → Pantry', () => {
      expect(inferCategory("tahini")).toBe("Pantry");
    });
    it('"turmeric" → Spices', () => {
      expect(inferCategory("turmeric")).toBe("Spices");
    });
  });

  describe("reference table", () => {
    it('"tofu" → Pantry', () => {
      expect(inferCategory("tofu")).toBe("Pantry");
    });
    it('"hummus" → Pantry', () => {
      expect(inferCategory("hummus")).toBe("Pantry");
    });
    it('"coffee" → Pantry', () => {
      expect(inferCategory("coffee")).toBe("Pantry");
    });
  });

  describe("edge cases", () => {
    it('empty string → Other', () => {
      expect(inferCategory("")).toBe("Other");
    });
    it('whitespace-only → Other', () => {
      expect(inferCategory("   ")).toBe("Other");
    });
    it('unknown item → Other', () => {
      expect(inferCategory("unknown item xyz")).toBe("Other");
    });
  });
});
