"use client";

import { useMemo, useState, useEffect } from "react";
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
  pointerWithin,
} from "@dnd-kit/core";
import { format, addDays, startOfDay, parseISO, isSameDay } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TrashIcon } from "@heroicons/react/24/outline";

interface Dinner {
  id: string;
  date: string;
  mealName: string;
  description: string | null;
  url: string | null;
  ingredients: string | null;
  isComplete: boolean;
  orderIndex: number;
  linkedDinnerId: string | null;
}

interface RotationItem {
  id: string;
  mealName: string;
  description: string | null;
}

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const SLOT_IDS = ["slot-0", "slot-1", "slot-2", "slot-3", "slot-4", "slot-5", "slot-6"] as const;
const ROW_HEIGHT = "min-h-[3.5rem]";

function DayDateSquare({ date }: { date: Date }) {
  return (
    <div
      className={`flex w-16 shrink-0 flex-col items-center justify-center rounded bg-gray-700/80 text-center ${ROW_HEIGHT}`}
    >
      <span className="text-xs font-medium uppercase text-gray-300">
        {format(date, "EEE")}
      </span>
      <span className="text-sm text-white">{format(date, "M/d")}</span>
    </div>
  );
}

function DinnerCard({
  dinner,
  onDelete,
  onDoubleClick,
  isOverlay,
}: {
  dinner: Dinner;
  onDelete: (id: string) => void;
  onDoubleClick?: (id: string) => void;
  isOverlay?: boolean;
}) {
  const inner = (
    <div
      className={`flex items-center gap-3 rounded bg-gray-700 px-3 py-2 ${ROW_HEIGHT} ${
        isOverlay ? "shadow-lg ring-2 ring-blue-500" : ""
      }`}
      onDoubleClick={() => onDoubleClick?.(dinner.id)}
    >
      <div className="min-w-0 flex-1 flex items-center gap-2 flex-nowrap">
        <span className="font-medium truncate">{dinner.mealName}</span>
        {dinner.description && (
          <span className="text-sm text-gray-400 truncate shrink-0">
            {dinner.description}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(dinner.id);
        }}
        className="shrink-0 text-gray-400 hover:text-red-400 p-1"
        aria-label="Delete"
      >
        <TrashIcon className="h-5 w-5" />
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
  onDelete,
  onDoubleClick,
}: {
  slotId: string;
  date: Date;
  dinner: Dinner | null;
  onDelete: (id: string) => void;
  onDoubleClick: (id: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: slotId });
  const hasDinner = dinner !== null;

  return (
    <div className="flex items-stretch gap-3">
      <DayDateSquare date={date} />
      <div
        ref={setNodeRef}
        className={`flex-1 rounded transition-colors ${ROW_HEIGHT} ${
          hasDinner
            ? ""
            : isOver
              ? "border-2 border-blue-500 bg-gray-700/50"
              : "border-2 border-dashed border-gray-600 bg-gray-700/30"
        }`}
      >
        {dinner ? (
          <div className="h-full p-1">
            <DinnerCard
              dinner={dinner}
              onDelete={onDelete}
              onDoubleClick={onDoubleClick}
            />
          </div>
        ) : (
          <div className={`flex items-center px-3 text-gray-500 text-sm ${ROW_HEIGHT}`}>
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
  expandToView?: "rotation" | null;
  clearExpandToView?: () => void;
  onExpandToRotation?: () => void;
}

export default function DinnersWidget({
  isExpanded,
  onExpandToggle,
  expandToView,
  clearExpandToView,
  onExpandToRotation,
}: DinnersWidgetProps = {}) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMeal, setNewMeal] = useState({
    mealName: "",
    description: "",
    url: "",
    ingredients: "",
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<"weekly" | "edit" | "rotation">("weekly");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    mealName: "",
    description: "",
    url: "",
    ingredients: "",
  });
  const [addToDinnerDialogItem, setAddToDinnerDialogItem] =
    useState<RotationItem | null>(null);
  const [removeFromRotationId, setRemoveFromRotationId] = useState<string | null>(null);

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

  const { data: rotationItems = [] } = useQuery<RotationItem[]>({
    queryKey: ["dinners-rotation"],
    queryFn: async () => {
      const res = await fetch("/api/widgets/dinners/rotation");
      if (!res.ok) throw new Error("Failed to fetch rotation");
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
    mutationFn: async (body: {
      mealName: string;
      description?: string;
      url?: string | null;
      ingredients?: string | null;
      date: string;
    }) => {
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
      setNewMeal({
        mealName: "",
        description: "",
        url: "",
        ingredients: "",
      });
      setAddToDinnerDialogItem(null);
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
      setEditingId(null);
      setView("weekly");
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

  const addToRotationMutation = useMutation({
    mutationFn: async (body: { mealName: string; description?: string }) => {
      const res = await fetch("/api/widgets/dinners/rotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to add to rotation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dinners-rotation"] });
    },
  });

  const removeFromRotationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/widgets/dinners/rotation/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove from rotation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dinners-rotation"] });
      setRemoveFromRotationId(null);
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
      url: newMeal.url.trim() || undefined,
      ingredients: newMeal.ingredients.trim() || undefined,
      date,
    });
  };

  const handleAddFromRotation = () => {
    if (!addToDinnerDialogItem) return;
    const date = getNextAvailableDate();
    createMutation.mutate({
      mealName: addToDinnerDialogItem.mealName,
      description: addToDinnerDialogItem.description ?? undefined,
      date,
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || typeof active.id !== "string") return;

    const fromSlot = slots.findIndex((s) => s?.id === active.id);
    if (fromSlot < 0) return;

    let toSlot: number;
    const overIdStr = typeof over.id === "string" ? over.id : String(over.id);
    const isSlotDroppable =
      typeof over.id === "string" && over.id.startsWith("slot-");
    if (isSlotDroppable) {
      toSlot = parseInt(overIdStr.replace("slot-", ""), 10);
      if (Number.isNaN(toSlot) || toSlot < 0 || toSlot > 6) return;
    } else {
      toSlot = slots.findIndex((s) => s?.id === over.id);
      if (toSlot < 0) return;
    }

    if (fromSlot === toSlot) return;

    const movedDinner = slots[fromSlot]!;
    const occupant = slots[toSlot] ?? null;
    const updates: { id: string; date: string }[] = [
      { id: movedDinner.id, date: format(dates[toSlot], "yyyy-MM-dd") },
    ];
    if (occupant) {
      updates.push({
        id: occupant.id,
        date: format(dates[fromSlot], "yyyy-MM-dd"),
      });
    }

    // #region agent log
    fetch(
      "http://127.0.0.1:7796/ingest/a40eb657-02c8-43a9-aa68-0dd8089b4fd0",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "4119a3",
        },
        body: JSON.stringify({
          sessionId: "4119a3",
          runId: "drag-end",
          hypothesisId: "H1,H2,H3,H4,H5",
          location: "DinnersWidget.tsx:handleDragEnd",
          message: "Drag end: over.id, slots, dates",
          data: {
            activeId: active.id,
            overId: over.id,
            overIdStr,
            isSlotDroppable,
            fromSlot,
            toSlot,
            dateFromSlot: format(dates[fromSlot], "yyyy-MM-dd"),
            dateToSlot: format(dates[toSlot], "yyyy-MM-dd"),
            movedMealName: movedDinner.mealName,
            occupantId: occupant?.id ?? null,
            occupantMealName: occupant?.mealName ?? null,
            updates: updates.map((u) => ({ ...u })),
            slotIdsByIndex: slots.map((s, i) => ({ i, id: s?.id ?? null, name: s?.mealName ?? "empty" })),
          },
          timestamp: Date.now(),
        }),
      }
    ).catch(() => {});
    // #endregion

    for (const { id, date } of updates) {
      await updateMutation.mutateAsync({ id, data: { date } });
    }
    queryClient.invalidateQueries({ queryKey: ["dinners"] });
  };

  const handleDoubleClick = (id: string) => {
    const d = dinners.find((x) => x.id === id);
    if (d) {
      setEditingId(id);
      setEditForm({
        mealName: d.mealName,
        description: d.description ?? "",
        url: d.url ?? "",
        ingredients: d.ingredients ?? "",
      });
      setView("edit");
    }
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    updateMutation.mutate({
      id: editingId,
      data: {
        mealName: editForm.mealName.trim(),
        description: editForm.description.trim() || null,
        url: editForm.url.trim() || null,
        ingredients: editForm.ingredients.trim() || null,
      },
    });
  };

  const handleAddToRotationFromEdit = async () => {
    if (!editForm.mealName.trim()) return;
    try {
      await addToRotationMutation.mutateAsync({
        mealName: editForm.mealName.trim(),
        description: editForm.description.trim() || undefined,
      });
      await queryClient.refetchQueries({ queryKey: ["dinners-rotation"] });
      setEditingId(null);
      setView("rotation");
    } catch {
      // Mutation already surfaces error
    }
  };

  const tonightDinner = slots[0] ?? null;

  useEffect(() => {
    if (isExpanded && expandToView === "rotation") {
      setView("rotation");
      clearExpandToView?.();
    }
  }, [isExpanded, expandToView, clearExpandToView]);

  const currentContent = (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase text-gray-400">
        Tonight&apos;s Meal:
      </div>
      {tonightDinner ? (
        <>
          <div className="text-lg font-semibold">{tonightDinner.mealName}</div>
          {tonightDinner.description && (
            <div className="text-sm text-gray-400">
              {tonightDinner.description}
            </div>
          )}
        </>
      ) : (
        <div className="text-gray-400">No dinner planned for tonight</div>
      )}
    </div>
  );

  const editViewContent = editingId && (
    <div className="space-y-4">
      <h3 className="font-semibold">Edit dinner</h3>
      <div className="space-y-2 rounded bg-gray-700 p-3">
        <input
          type="text"
          placeholder="Meal name"
          value={editForm.mealName}
          onChange={(e) =>
            setEditForm((f) => ({ ...f, mealName: e.target.value }))
          }
          className="w-full rounded bg-gray-600 px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={editForm.description}
          onChange={(e) =>
            setEditForm((f) => ({ ...f, description: e.target.value }))
          }
          className="w-full rounded bg-gray-600 px-3 py-2 text-sm"
        />
        <input
          type="url"
          placeholder="Recipe URL (optional)"
          value={editForm.url}
          onChange={(e) => setEditForm((f) => ({ ...f, url: e.target.value }))}
          className="w-full rounded bg-gray-600 px-3 py-2 text-sm"
        />
        {editForm.url.trim() && isValidHttpUrl(editForm.url.trim()) && (
          <a
            href={editForm.url.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Open recipe in new window
          </a>
        )}
        <textarea
          placeholder="Ingredients (optional — for grocery list later)"
          value={editForm.ingredients}
          onChange={(e) =>
            setEditForm((f) => ({ ...f, ingredients: e.target.value }))
          }
          rows={3}
          className="w-full rounded bg-gray-600 px-3 py-2 text-sm resize-y min-h-[4rem]"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSaveEdit}
            disabled={!editForm.mealName.trim() || updateMutation.isPending}
            className="rounded bg-green-600 px-3 py-2 text-sm hover:bg-green-700 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={handleAddToRotationFromEdit}
            disabled={!editForm.mealName.trim() || addToRotationMutation.isPending}
            className="rounded bg-blue-600 px-3 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            Add to Rotation
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setView("weekly");
            }}
            className="rounded bg-gray-600 px-3 py-2 text-sm hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  const rotationViewContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Rotation</h3>
        <button
          type="button"
          onClick={() => setView("weekly")}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          Back to weekly plan
        </button>
      </div>
      <ul className="grid grid-cols-3 gap-2">
        {rotationItems.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-1 rounded bg-gray-700 px-3 py-2 cursor-pointer hover:bg-gray-600 min-w-0"
            onClick={() => setAddToDinnerDialogItem(item)}
          >
            <div className="flex items-start justify-between gap-1 min-w-0">
              <span className="font-medium min-w-0 truncate">
                {item.mealName}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setRemoveFromRotationId(item.id);
                }}
                className="shrink-0 text-gray-400 hover:text-red-400 p-0.5"
                aria-label="Remove from rotation"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
            {item.description && (
              <span className="text-sm text-gray-400 truncate">
                {item.description}
              </span>
            )}
          </li>
        ))}
      </ul>
      {rotationItems.length === 0 && (
        <p className="text-gray-400 text-sm">No items in rotation yet.</p>
      )}
    </div>
  );

  const weeklyContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Weekly Plan</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-700"
          >
            {showAddForm ? "Cancel" : "Add Meal"}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="space-y-2 rounded bg-gray-700 p-3">
          <input
            type="text"
            placeholder="Meal name"
            value={newMeal.mealName}
            onChange={(e) =>
              setNewMeal((m) => ({ ...m, mealName: e.target.value }))
            }
            className="w-full rounded bg-gray-600 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newMeal.description}
            onChange={(e) =>
              setNewMeal((m) => ({ ...m, description: e.target.value }))
            }
            className="w-full rounded bg-gray-600 px-3 py-2 text-sm"
          />
          <input
            type="url"
            placeholder="Recipe URL (optional)"
            value={newMeal.url}
            onChange={(e) =>
              setNewMeal((m) => ({ ...m, url: e.target.value }))
            }
            className="w-full rounded bg-gray-600 px-3 py-2 text-sm"
          />
          {newMeal.url.trim() && isValidHttpUrl(newMeal.url.trim()) && (
            <a
              href={newMeal.url.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Open recipe in new window
            </a>
          )}
          <textarea
            placeholder="Ingredients (optional — for grocery list later)"
            value={newMeal.ingredients}
            onChange={(e) =>
              setNewMeal((m) => ({ ...m, ingredients: e.target.value }))
            }
            rows={3}
            className="w-full rounded bg-gray-600 px-3 py-2 text-sm resize-y min-h-[4rem]"
          />
          <button
            type="button"
            onClick={handleAddMeal}
            disabled={
              !newMeal.mealName.trim() || createMutation.isPending
            }
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
          collisionDetection={pointerWithin}
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
                onDelete={(id) => deleteMutation.mutate(id)}
                onDoubleClick={handleDoubleClick}
              />
            ))}
          </div>

          <DragOverlay>
            {activeId ? (
              (() => {
                const dinner = dinners.find((d) => d.id === activeId);
                if (!dinner) return null;
                return (
                  <div className="w-[min(100%,20rem)]">
                    <DinnerCard
                      dinner={dinner}
                      onDelete={() => {}}
                      isOverlay
                    />
                  </div>
                );
              })()
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <button
        type="button"
        onClick={() => setView("rotation")}
        className="text-sm text-blue-400 hover:text-blue-300"
      >
        View Rotation
      </button>
    </div>
  );

  const expandedBody =
    view === "edit"
      ? editViewContent
      : view === "rotation"
        ? rotationViewContent
        : weeklyContent;

  return (
    <>
      <Widget
        title="Dinners"
        expandedContent={expandedBody}
        className="lg:col-span-1"
        isExpanded={isExpanded}
        onExpandToggle={onExpandToggle}
      >
        {currentContent}
      </Widget>

      {addToDinnerDialogItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setAddToDinnerDialogItem(null)}
        >
          <div
            className="rounded-lg bg-gray-800 p-4 shadow-xl max-w-sm w-full mx-4 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-gray-200">
              Add &quot;{addToDinnerDialogItem.mealName}&quot; to the dinner list?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setAddToDinnerDialogItem(null)}
                className="rounded bg-gray-600 px-3 py-2 text-sm hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddFromRotation}
                disabled={createMutation.isPending}
                className="rounded bg-green-600 px-3 py-2 text-sm hover:bg-green-700 disabled:opacity-50"
              >
                Add to Dinner List
              </button>
            </div>
          </div>
        </div>
      )}

      {removeFromRotationId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setRemoveFromRotationId(null)}
        >
          <div
            className="rounded-lg bg-gray-800 p-4 shadow-xl max-w-sm w-full mx-4 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-gray-200">Remove this item from the rotation?</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setRemoveFromRotationId(null)}
                className="rounded bg-gray-600 px-3 py-2 text-sm hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  removeFromRotationMutation.mutate(removeFromRotationId)
                }
                disabled={removeFromRotationMutation.isPending}
                className="rounded bg-red-600 px-3 py-2 text-sm hover:bg-red-700 disabled:opacity-50"
              >
                Remove from Rotation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
