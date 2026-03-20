/** Kanban list filter state (Projects widget). */
export type KanbanPriorityFilter = "all" | "1" | "2" | "3";

export function matchesKanbanFilters(
  todo: { priority: number; ownerUserId: string | null },
  priorityFilter: KanbanPriorityFilter,
  ownerFilter: string
): boolean {
  if (priorityFilter !== "all") {
    const pf = Number(priorityFilter);
    if (todo.priority !== pf) return false;
  }
  if (ownerFilter !== "all") {
    if (ownerFilter === "shared") {
      if (todo.ownerUserId) return false;
    } else if (todo.ownerUserId !== ownerFilter) {
      return false;
    }
  }
  return true;
}
