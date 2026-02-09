"use client";

import { useEffect, useState } from "react";
import Widget from "@/components/ui/Widget";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, startOfWeek, addDays, isToday, parseISO } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Dinner {
  id: string;
  date: string;
  mealName: string;
  description: string | null;
  isComplete: boolean;
  orderIndex: number;
  linkedDinnerId: string | null;
}

function SortableDinnerItem({
  dinner,
  onToggleComplete,
  onDelete,
}: {
  dinner: Dinner;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dinner.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-gray-700 rounded p-3 mb-2 flex items-center gap-3 ${
        dinner.isComplete ? "opacity-60" : ""
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-white"
      >
        ⋮⋮
      </div>
      <input
        type="checkbox"
        checked={dinner.isComplete}
        onChange={() => onToggleComplete(dinner.id)}
        className="w-4 h-4"
      />
      <div className="flex-1">
        <div
          className={`font-medium ${dinner.isComplete ? "line-through" : ""}`}
        >
          {dinner.mealName}
        </div>
        {dinner.description && (
          <div className="text-sm text-gray-400">{dinner.description}</div>
        )}
        <div className="text-xs text-gray-500 mt-1">
          {format(parseISO(dinner.date), "EEE, MMM d")}
        </div>
      </div>
      <button
        onClick={() => onDelete(dinner.id)}
        className="text-red-400 hover:text-red-300 text-sm"
      >
        Delete
      </button>
    </div>
  );
}

interface DinnersWidgetProps {
  isExpanded?: boolean;
  onExpandToggle?: () => void;
}

export default function DinnersWidget({ isExpanded, onExpandToggle }: DinnersWidgetProps = {}) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMeal, setNewMeal] = useState({
    mealName: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: dinners = [], isLoading } = useQuery<Dinner[]>({
    queryKey: ["dinners"],
    queryFn: async () => {
      const startDate = format(startOfWeek(new Date()), "yyyy-MM-dd");
      const endDate = format(addDays(startOfWeek(new Date()), 6), "yyyy-MM-dd");
      const response = await fetch(
        `/api/widgets/dinners?startDate=${startDate}&endDate=${endDate}`
      );
      if (!response.ok) throw new Error("Failed to fetch dinners");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (dinner: Partial<Dinner>) => {
      const response = await fetch("/api/widgets/dinners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dinner),
      });
      if (!response.ok) throw new Error("Failed to create dinner");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dinners"] });
      setShowAddForm(false);
      setNewMeal({ mealName: "", description: "", date: format(new Date(), "yyyy-MM-dd") });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Dinner> }) => {
      const response = await fetch(`/api/widgets/dinners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update dinner");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dinners"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/widgets/dinners/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete dinner");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dinners"] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = dinners.findIndex((d) => d.id === active.id);
    const newIndex = dinners.findIndex((d) => d.id === over.id);

    const newDinners = arrayMove(dinners, oldIndex, newIndex);
    newDinners.forEach((dinner, index) => {
      if (dinner.orderIndex !== index) {
        updateMutation.mutate({
          id: dinner.id,
          data: { orderIndex: index },
        });
      }
    });
  };

  const tonightDinner = dinners.find((d) => {
    const dinnerDate = parseISO(d.date);
    return isToday(dinnerDate) && !d.isComplete;
  });

  const currentContent = tonightDinner ? (
    <div className="space-y-2">
      <div className="font-semibold text-lg">{tonightDinner.mealName}</div>
      {tonightDinner.description && (
        <div className="text-sm text-gray-400">{tonightDinner.description}</div>
      )}
    </div>
  ) : (
    <div className="text-gray-400">No dinner planned for tonight</div>
  );

  const weeklyContent = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Weekly Plan</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-sm bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
        >
          {showAddForm ? "Cancel" : "Add Meal"}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-gray-700 rounded p-3 space-y-2">
          <input
            type="text"
            placeholder="Meal name"
            value={newMeal.mealName}
            onChange={(e) =>
              setNewMeal({ ...newMeal, mealName: e.target.value })
            }
            className="w-full bg-gray-600 rounded px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newMeal.description}
            onChange={(e) =>
              setNewMeal({ ...newMeal, description: e.target.value })
            }
            className="w-full bg-gray-600 rounded px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={newMeal.date}
            onChange={(e) => setNewMeal({ ...newMeal, date: e.target.value })}
            className="w-full bg-gray-600 rounded px-3 py-2 text-sm"
          />
          <button
            onClick={() => createMutation.mutate(newMeal)}
            disabled={!newMeal.mealName || createMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-gray-400">Loading...</div>
      ) : dinners.length === 0 ? (
        <div className="text-gray-400 text-sm">No meals planned this week</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={dinners.map((d) => d.id)}
            strategy={verticalListSortingStrategy}
          >
            {dinners.map((dinner) => (
              <SortableDinnerItem
                key={dinner.id}
                dinner={dinner}
                onToggleComplete={(id) =>
                  updateMutation.mutate({
                    id,
                    data: {
                      isComplete: !dinners.find((d) => d.id === id)?.isComplete,
                    },
                  })
                }
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </SortableContext>
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
