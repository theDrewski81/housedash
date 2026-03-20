import { describe, expect, it } from "vitest";
import { matchesKanbanFilters } from "./kanban-todo-filters";

const t = (priority: number, ownerUserId: string | null) => ({
  priority,
  ownerUserId,
});

describe("matchesKanbanFilters", () => {
  it("passes all when filters are all", () => {
    expect(matchesKanbanFilters(t(2, "u1"), "all", "all")).toBe(true);
    expect(matchesKanbanFilters(t(2, null), "all", "all")).toBe(true);
  });

  it("filters by priority", () => {
    expect(matchesKanbanFilters(t(1, null), "1", "all")).toBe(true);
    expect(matchesKanbanFilters(t(2, null), "1", "all")).toBe(false);
  });

  it("filters by shared owner", () => {
    expect(matchesKanbanFilters(t(1, null), "all", "shared")).toBe(true);
    expect(matchesKanbanFilters(t(1, "u1"), "all", "shared")).toBe(false);
  });

  it("filters by owner id", () => {
    expect(matchesKanbanFilters(t(1, "u1"), "all", "u1")).toBe(true);
    expect(matchesKanbanFilters(t(1, "u2"), "all", "u1")).toBe(false);
    expect(matchesKanbanFilters(t(1, null), "all", "u1")).toBe(false);
  });
});
