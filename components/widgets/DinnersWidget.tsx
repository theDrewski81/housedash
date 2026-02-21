"use client";

import { useMemo, useState } from "react";
import Widget from "@/components/ui/Widget";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { format, addDays, startOfDay, parseISO, isSameDay } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isToday } from "date-fns";

interface Dinner {
  id: string;
  date: string;
  mealName: string;
  description: string | null;
  isComplete: boolean;
  orderIndex: number;
  linkedDinnerId: string | null;
}

const SLOT_IDS = ["slot-0", "slot-1", "slot-2", "slot-3", "slot-4", "slot-5", "slot-6"] as const;

function DayDateSquare({ date }: { date: Date }) {
  return (
    <div className="flex h-full min-h-[3.5rem] w-16 shrink-0 flex-col items-center justify-center rounded bg-gray-700/80 text-center">
      <span className="text-xs font-medium uppercase text-gray-300">
        {format(date, "EEE")}
      </span>
      <span className="text-sm text-white">{format(date, "M/d")}</span>
    </div>
  );
}

function DinnerCard({
  dinner,
  onToggleComplete,
  onDelete,
  isOverlay,
}: {
  dinner: Dinner;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  isOverlay?: boolean;
}) {
  const inner = (
    <div
      className={`flex items-center gap-3 rounded bg-gray-700 p-3 ${
        dinner.isComplete ? "opacity-60" : ""
      } ${isOverlay ? "shadow-lg ring-2 ring-blue-500" : ""}`}
    >
      <input
        type="checkbox"
        checked={dinner.isComplete}
        onChange={() => onToggleComplete(dinner.id)}
        className="h-4 w-4 shrink-0"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="min-w-0 flex-1">
        <div
          className={`font-medium ${dinner.isComplete ? "line-through" : ""}`}
        >
          {dinner.mealName}
        </div>
        {dinner.description && (
          <div className="text-sm text-gray-400">{dinner.description}</div>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(dinner.id);
        }}
        className="shrink-0 text-sm text-red-400 hover:text-red-300"
      >
        Delete
      </button>
    </div>
  );

  if (isOverlay) return inner;

  return (
    <DraggableDinner id={dinner.id}>
      {inner}
    </DraggableDinner>
  );
}

function DraggableDinner({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`touch-none ${isDragging ? "opacity-50" : ""}`}
      {...listeners}
      {...attributes}
    >
      <div className="cursor-grab active:cursor-grabbing">{children}</div>
    </div>
  );
}

function SlotRow({
  slotId,
  date,
  dinner,
  onToggleComplete,
  onDelete,
}: {
  slotId: string;
  date: Date;
  dinner: Dinner | null;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: slotId });

  return (
    <div className="flex items-stretch gap-3">
      <DayDateSquare date={date} />
      <div
        ref={setNodeRef}
        className={`min-h-[3.5rem] flex-1 rounded border-2 border-dashed transition-colors ${
          isOver ? "border-blue-500 bg-gray-700/50" : "border-gray-600 bg-gray-700/30"
        }`}
      >
        {dinner ? (
          <div className="p-2">
            <DinnerCard
              dinner={dinner}
              onToggleComplete={onToggleComplete}
              onDelete={onDelete}
            />
          </div>
        ) : (
          <div className="flex min-h-[3.5rem] items-center px-3 text-gray-500 text-sm">
            Empty
          </div>
        )}
      </div>
    </div>
  );
}

interface DinnersWidgetProps {
  isExpanded?: boolean;
  onExpandToggle?: () => void;
}

export default function DinnersWidget({
  isExpanded,
  onExpandToggle,
}: DinnersWidgetProps = {}) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMeal, setNewMeal] = useState({ mealName: "", description: "" });
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const today = useMemo(() => startOfDay(new Date()), []);
  const dates = useMemo(
    () => [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(today, i)),
    [today]
  );

  const { data: dinners = [], isLoading } = useQuery<Dinner[]>({
    queryKey: ["dinners", format(today, "yyyy-MM-dd")],
    queryFn: async () => {
      const startDate = format(today, "yyyy-MM-dd");
      const endDate = format(addDays(today, 6), "yyyy-MM-dd");
      const res = await fetch(
        `/api/widgets/dinners?startDate=${startDate}&endDate=${endDate}`
      );
      if (!res.ok) throw new Error("Failed to fetch dinners");
      return res.json();
    },
  });

  const slots = useMemo(() => {
    const result: (Dinner | null)[] = dates.map(() => null);
    const sorted = [...dinners].sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime() ||
        a.orderIndex - b.orderIndex
    );
    for (const d of sorted) {
      const dDate = parseISO(d.date);
      let idx = dates.findIndex((dt) => isSameDay(dt, dDate));
      if (idx < 0 || result[idx] !== null) {
        idx = result.findIndex((s) => s === null);
      }
      if (idx >= 0) result[idx] = d;
    }
    return result;
  }, [dinners, dates]);

  const createMutation = useMutation({
    mutationFn: async (body: { mealName: string; description?: string; date: string }) => {
      const res = await fetch("/api/widgets/dinners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create dinner");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dinners"] });
      setShowAddForm(false);
      setNewMeal({ mealName: "", description: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Dinner>;
    }) => {
      const res = await fetch(`/api/widgets/dinners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update dinner");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dinners"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/widgets/dinners/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete dinner");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dinners"] });
    },
  });

  const getNextAvailableDate = (): string => {
    const firstEmpty = slots.findIndex((s) => s === null);
    const idx = firstEmpty >= 0 ? firstEmpty : dates.length - 1;
    return format(dates[idx], "yyyy-MM-dd");
  };

  const handleAddMeal = () => {
    if (!newMeal.mealName.trim()) return;
    const date = getNextAvailableDate();
    createMutation.mutate({
      mealName: newMeal.mealName.trim(),
      description: newMeal.description.trim() || undefined,
      date,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || typeof active.id !== "string") return;

    const fromSlot = slots.findIndex((s) => s?.id === active.id);
    if (fromSlot < 0) return;

    let toSlot: number;
    if (typeof over.id === "string" && over.id.startsWith("slot-")) {
      toSlot = parseInt(over.id.replace("slot-", ""), 10);
      if (Number.isNaN(toSlot) || toSlot < 0 || toSlot > 6) return;
    } else {
      toSlot = slots.findIndex((s) => s?.id === over.id);
      if (toSlot < 0) return;
    }

    if (fromSlot === toSlot) return;

    const movedDinner = slots[fromSlot]!;
    const updates: { id: string; date: string }[] = [];

    if (toSlot < fromSlot) {
      updates.push({ id: movedDinner.id, date: format(dates[toSlot], "yyyy-MM-dd") });
      for (let j = toSlot; j < fromSlot; j++) {
        const d = slots[j];
        if (d) updates.push({ id: d.id, date: format(dates[j + 1], "yyyy-MM-dd") });
      }
    } else {
      updates.push({ id: movedDinner.id, date: format(dates[toSlot], "yyyy-MM-dd") });
      for (let j = fromSlot + 1; j <= toSlot; j++) {
        const d = slots[j];
        if (d) updates.push({ id: d.id, date: format(dates[j - 1], "yyyy-MM-dd") });
      }
    }

    updates.forEach(({ id, date }) => {
      updateMutation.mutate({ id, data: { date } });
    });
  };

  const tonightDinner = dinners.find((d) => {
    const dDate = parseISO(d.date);
    return isToday(dDate) && !d.isComplete;
  });

  const currentContent = tonightDinner ? (
    <div className="space-y-2">
      <div className="text-lg font-semibold">{tonightDinner.mealName}</div>
      {tonightDinner.description && (
        <div className="text-sm text-gray-400">{tonightDinner.description}</div>
      )}
    </div>
  ) : (
    <div className="text-gray-400">No dinner planned for tonight</div>
  );

  const weeklyContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Weekly Plan</h3>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-700"
        >
          {showAddForm ? "Cancel" : "Add Meal"}
        </button>
      </div>

      {showAddForm && (
        <div className="space-y-2 rounded bg-gray-700 p-3">
          <input
            type="text"
            placeholder="Meal name"
            value={newMeal.mealName}
            onChange={(e) => setNewMeal((m) => ({ ...m, mealName: e.target.value }))}
            className="w-full rounded bg-gray-600 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newMeal.description}
            onChange={(e) => setNewMeal((m) => ({ ...m, description: e.target.value }))}
            className="w-full rounded bg-gray-600 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleAddMeal}
            disabled={!newMeal.mealName.trim() || createMutation.isPending}
            className="w-full rounded bg-green-600 px-3 py-2 text-sm hover:bg-green-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={(e) => setActiveId(e.active.id as string)}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-3">
            {dates.map((date, i) => (
              <SlotRow
                key={SLOT_IDS[i]}
                slotId={SLOT_IDS[i]}
                date={date}
                dinner={slots[i] ?? null}
                onToggleComplete={(id) => {
                  const d = dinners.find((x) => x.id === id);
                  if (d)
                    updateMutation.mutate({
                      id,
                      data: { isComplete: !d.isComplete },
                    });
                }}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeId ? (() => {
              const dinner = dinners.find((d) => d.id === activeId);
              if (!dinner) return null;
              return (
                <div className="w-[min(100%,20rem)]">
                  <DinnerCard
                    dinner={dinner}
                    onToggleComplete={() => {}}
                    onDelete={() => {}}
                    isOverlay
                  />
                </div>
              );
            })() : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );

  return (
    <Widget
      title="Dinners"
      expandedContent={weeklyContent}
      className="lg:col-span-1"
      isExpanded={isExpanded}
      onExpandToggle={onExpandToggle}
    >
      {currentContent}
    </Widget>
  );
}
