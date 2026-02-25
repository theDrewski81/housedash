"use client";

import { useState } from "react";
import Widget from "@/components/ui/Widget";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Grocery {
  id: string;
  itemName: string;
  category: string;
  quantity: string | null;
  isComplete: boolean;
}

interface GroceriesWidgetProps {
  isExpanded?: boolean;
  onExpandToggle?: () => void;
}

export default function GroceriesWidget({ isExpanded, onExpandToggle }: GroceriesWidgetProps = {}) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    itemName: "",
    category: "Other",
    quantity: "",
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({
    itemName: "",
    category: "Other",
    quantity: "",
  });

  const { data: groceries = [], isLoading } = useQuery<Grocery[]>({
    queryKey: ["groceries"],
    queryFn: async () => {
      const response = await fetch("/api/widgets/groceries");
      if (!response.ok) throw new Error("Failed to fetch groceries");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (item: Partial<Grocery>) => {
      const response = await fetch("/api/widgets/groceries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (!response.ok) throw new Error("Failed to create item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groceries"] });
      setShowAddForm(false);
      setNewItem({ itemName: "", category: "Other", quantity: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Grocery> }) => {
      const response = await fetch(`/api/widgets/groceries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groceries"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/widgets/groceries/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groceries"] });
    },
  });

  const incompleteCount = groceries.filter((g) => !g.isComplete).length;
  const categories = Array.from(new Set(groceries.map((g) => g.category)));

  const groupedGroceries = groceries.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, Grocery[]>);

  const currentContent = (
    <div className="space-y-2">
      <div className="text-3xl font-bold">{incompleteCount}</div>
      <div className="text-sm text-gray-400">
        {incompleteCount === 1 ? "item" : "items"} remaining
      </div>
    </div>
  );

  const expandedContent = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Grocery List</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-sm bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
        >
          {showAddForm ? "Cancel" : "Add Item"}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-gray-700 rounded p-3 space-y-2">
          <input
            type="text"
            placeholder="Item name"
            value={newItem.itemName}
            onChange={(e) =>
              setNewItem({ ...newItem, itemName: e.target.value })
            }
            className="w-full bg-gray-600 rounded px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Category"
            value={newItem.category}
            onChange={(e) =>
              setNewItem({ ...newItem, category: e.target.value })
            }
            className="w-full bg-gray-600 rounded px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Quantity (optional)"
            value={newItem.quantity}
            onChange={(e) =>
              setNewItem({ ...newItem, quantity: e.target.value })
            }
            className="w-full bg-gray-600 rounded px-3 py-2 text-sm"
          />
          <button
            onClick={() => createMutation.mutate(newItem)}
            disabled={!newItem.itemName || createMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-gray-400">Loading...</div>
      ) : groceries.length === 0 ? (
        <div className="text-gray-400 text-sm">No items in list</div>
      ) : (
        <div className="space-y-4">
          {categories.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`text-xs px-2 py-1 rounded ${
                  selectedCategory === null
                    ? "bg-blue-600"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === cat ? null : cat
                    )
                  }
                  className={`text-xs px-2 py-1 rounded ${
                    selectedCategory === cat
                      ? "bg-blue-600"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {Object.entries(groupedGroceries)
              .filter(([cat]) => !selectedCategory || cat === selectedCategory)
              .map(([category, items]) => (
                <div key={category}>
                  <div className="font-semibold text-sm text-gray-300 mb-2">
                    {category}
                  </div>
                  <div className="space-y-2">
                    {items.map((item) =>
                      editingId === item.id ? (
                        <div
                          key={item.id}
                          className="bg-gray-700 rounded p-3 space-y-2"
                        >
                          <input
                            type="text"
                            placeholder="Item name"
                            value={editForm.itemName}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                itemName: e.target.value,
                              }))
                            }
                            className="w-full bg-gray-600 rounded px-3 py-2 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Category"
                            value={editForm.category}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                category: e.target.value,
                              }))
                            }
                            className="w-full bg-gray-600 rounded px-3 py-2 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Quantity (optional)"
                            value={editForm.quantity}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                quantity: e.target.value,
                              }))
                            }
                            className="w-full bg-gray-600 rounded px-3 py-2 text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                updateMutation.mutate(
                                  {
                                    id: item.id,
                                    data: {
                                      itemName: editForm.itemName.trim(),
                                      category: editForm.category.trim() || "Other",
                                      quantity: editForm.quantity.trim() || null,
                                    },
                                  },
                                  {
                                    onSuccess: () => setEditingId(null),
                                  }
                                );
                              }}
                              disabled={
                                !editForm.itemName.trim() ||
                                updateMutation.isPending
                              }
                              className="rounded bg-green-600 px-3 py-1 text-sm hover:bg-green-700 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded bg-gray-600 px-3 py-1 text-sm hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate(item.id)}
                              className="rounded bg-red-600 px-3 py-1 text-sm hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          key={item.id}
                          className={`bg-gray-700 rounded p-2 flex items-center gap-3 ${
                            item.isComplete ? "opacity-60" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={item.isComplete}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateMutation.mutate({
                                id: item.id,
                                data: { isComplete: !item.isComplete },
                              });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4"
                          />
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => {
                              setEditingId(item.id);
                              setEditForm({
                                itemName: item.itemName,
                                category: item.category,
                                quantity: item.quantity ?? "",
                              });
                            }}
                          >
                            <div
                              className={`${
                                item.isComplete ? "line-through" : ""
                              }`}
                            >
                              {item.itemName}
                            </div>
                            {item.quantity && (
                              <div className="text-xs text-gray-400">
                                {item.quantity}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMutation.mutate(item.id);
                            }}
                            className="text-red-400 hover:text-red-300 text-sm shrink-0"
                          >
                            Delete
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Widget
      title="Groceries"
      expandedContent={expandedContent}
      className="lg:col-span-1"
      isExpanded={isExpanded}
      onExpandToggle={onExpandToggle}
    >
      {currentContent}
    </Widget>
  );
}
