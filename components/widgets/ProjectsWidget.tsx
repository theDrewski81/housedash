"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Widget from "@/components/ui/Widget";
import {
  format,
  parseISO,
  differenceInHours,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  differenceInYears,
} from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TrashIcon } from "@heroicons/react/24/outline";
import {
  DndContext,
  type DragEndEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const DEFAULT_COLUMNS: { id: string; label: string; color: string }[] = [
  { id: "NOT_READY", label: "Not Ready", color: "" },
  { id: "STARTING", label: "Starting", color: "#93c5fd" },
  { id: "IN_PROGRESS", label: "In Progress", color: "#60a5fa" },
  { id: "COMPLETE", label: "Complete", color: "#3b82f6" },
];

type ProjectTodoStatus = "NOT_READY" | "STARTING" | "IN_PROGRESS" | "COMPLETE";

interface ProjectTodo {
  id: string;
  title: string;
  priority: number;
  initialPriority: number | null;
  status: ProjectTodoStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectsConfig {
  columns?: { id: string; label: string; color: string }[];
}

interface ProjectsWidgetProps {
  isExpanded?: boolean;
  onExpandToggle?: () => void;
  expandToView?: "completions" | null;
  clearExpandToView?: () => void;
  onExpandToCompletions?: () => void;
}

function parseProjectsConfig(raw: unknown): { id: string; label: string; color: string }[] {
  const obj = raw as ProjectsConfig | null | undefined;
  if (!obj || !Array.isArray(obj.columns) || obj.columns.length === 0)
    return DEFAULT_COLUMNS;
  return obj.columns.map((c) => ({
    id: typeof c.id === "string" ? c.id : String(c.id ?? ""),
    label: typeof c.label === "string" ? c.label : String(c.id ?? ""),
    color: typeof c.color === "string" ? c.color : "",
  }));
}

const COLUMN_ID_PREFIX = "col-";

function ProjectCard({
  todo,
  columnColor,
  previousColumnColors,
  onDelete,
  isCollapsing,
}: {
  todo: ProjectTodo;
  columnColor: string;
  previousColumnColors: string[];
  onDelete: (id: string) => void;
  isCollapsing?: boolean;
}) {
  const trailColors = previousColumnColors.filter(Boolean);

  const bgStyle = columnColor
    ? { backgroundColor: `${columnColor}20` }
    : undefined;
  const trailStyle =
    trailColors.length > 0
      ? {
          boxShadow: trailColors
            .map((c, i) => `inset ${2 + i * 2}px 0 0 -2px ${c}40`)
            .join(", "),
        }
      : undefined;

  return (
    <div
      className={`rounded bg-gray-700 px-3 py-2 transition-all duration-500 ${
        isCollapsing ? "overflow-hidden opacity-0 max-h-0 py-0 px-0 m-0" : ""
      }`}
      style={{ ...bgStyle, ...trailStyle }}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{todo.title}</div>
          <div className="text-xs text-gray-400">
            P{todo.priority} · {format(parseISO(todo.createdAt), "MMM d")}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(todo.id);
          }}
          className="shrink-0 text-gray-400 hover:text-red-400 p-1"
          aria-label="Delete"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function DraggableProjectCard({
  todo,
  columnColor,
  previousColumnColors,
  onDelete,
  isCollapsing,
}: {
  todo: ProjectTodo;
  columnColor: string;
  previousColumnColors: string[];
  onDelete: (id: string) => void;
  isCollapsing?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: todo.id,
    data: { status: todo.status },
  });
  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`touch-none ${isDragging ? "opacity-50 cursor-grabbing" : "cursor-grab"}`}
    >
      <ProjectCard
        todo={todo}
        columnColor={columnColor}
        previousColumnColors={previousColumnColors}
        onDelete={onDelete}
        isCollapsing={isCollapsing}
      />
    </div>
  );
}

function KanbanColumn({
  columnId,
  label,
  color,
  previousColumnColors,
  todos,
  onDelete,
  animatingOutIds,
}: {
  columnId: string;
  label: string;
  color: string;
  previousColumnColors: string[];
  todos: ProjectTodo[];
  onDelete: (id: string) => void;
  animatingOutIds: Set<string>;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${COLUMN_ID_PREFIX}${columnId}`,
    data: { columnId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[180px] rounded-lg border-2 border-solid transition-colors ${
        isOver ? "border-blue-500 bg-blue-900/20" : "border-gray-600 bg-gray-800/50"
      }`}
    >
      <div
        className="px-3 py-2 text-sm font-semibold border-b border-gray-700 rounded-t-lg"
        style={color ? { backgroundColor: `${color}30` } : undefined}
      >
        {label}
      </div>
      <div className="p-2 space-y-2 min-h-[120px]">
        {todos.map((todo) => (
          <DraggableProjectCard
            key={todo.id}
            todo={todo}
            columnColor={color}
            previousColumnColors={previousColumnColors}
            onDelete={onDelete}
            isCollapsing={animatingOutIds.has(todo.id)}
          />
        ))}
      </div>
    </div>
  );
}

function quantizeDuration(createdAt: Date, completedAt: Date): string {
  const ms = completedAt.getTime() - createdAt.getTime();
  const hours = differenceInHours(completedAt, createdAt);
  const days = differenceInDays(completedAt, createdAt);
  const weeks = differenceInWeeks(completedAt, createdAt);
  const months = differenceInMonths(completedAt, createdAt);
  const years = differenceInYears(completedAt, createdAt);

  if (years >= 1) return `${years} Year${years > 1 ? "s" : ""}`;
  if (months >= 1) return `${months} Month${months > 1 ? "s" : ""}`;
  if (weeks >= 1) return `${weeks} Week${weeks > 1 ? "s" : ""}`;
  if (days >= 1) return `${days} Day${days > 1 ? "s" : ""}`;
  if (hours >= 1) return `${hours} Hour${hours > 1 ? "s" : ""}`;
  return "< 1 Hour";
}

export default function ProjectsWidget({
  isExpanded,
  onExpandToggle,
  expandToView,
  clearExpandToView,
  onExpandToCompletions,
}: ProjectsWidgetProps = {}) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [view, setView] = useState<"kanban" | "completions">("kanban");
  const [completionsTab, setCompletionsTab] = useState<"list" | "priority" | "time">("list");
  const [completeWindowIds, setCompleteWindowIds] = useState<Set<string>>(new Set());
  const [animatingOutIds, setAnimatingOutIds] = useState<Set<string>>(new Set());
  const [newTodo, setNewTodo] = useState({
    title: "",
    priority: 2,
    status: "NOT_READY" as ProjectTodoStatus,
  });

  const { data: todos = [], isLoading } = useQuery<ProjectTodo[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/widgets/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });

  const { data: counts = {} } = useQuery<Record<string, number>>({
    queryKey: ["projects-counts"],
    queryFn: async () => {
      const res = await fetch("/api/widgets/projects?counts=true");
      if (!res.ok) throw new Error("Failed to fetch counts");
      return res.json();
    },
  });

  const { data: completions = [] } = useQuery<ProjectTodo[]>({
    queryKey: ["projects-completions"],
    queryFn: async () => {
      const res = await fetch("/api/widgets/projects/completions");
      if (!res.ok) throw new Error("Failed to fetch completions");
      return res.json();
    },
    enabled: view === "completions",
  });

  const { data: prefs } = useQuery<{ projectsConfig?: unknown }>({
    queryKey: ["user-preferences"],
    queryFn: async () => {
      const res = await fetch("/api/user/preferences");
      if (!res.ok) throw new Error("Failed to fetch preferences");
      return res.json();
    },
  });

  const columns = useMemo(
    () => parseProjectsConfig(prefs?.projectsConfig),
    [prefs?.projectsConfig]
  );

  const todosByStatus = useMemo(() => {
    const map: Record<string, ProjectTodo[]> = {};
    for (const col of columns) {
      let filtered = todos.filter((t) => t.status === col.id);
      if (col.id === "COMPLETE") {
        filtered = filtered.filter((t) => completeWindowIds.has(t.id));
      }
      map[col.id] = filtered.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    }
    return map;
  }, [todos, columns, completeWindowIds]);

  const createMutation = useMutation({
    mutationFn: async (body: { title: string; priority: number; status: ProjectTodoStatus }) => {
      const res = await fetch("/api/widgets/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create project");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects-counts"] });
      setShowAddForm(false);
      setNewTodo({ title: "", priority: 2, status: "NOT_READY" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { status?: ProjectTodoStatus };
    }) => {
      const res = await fetch(`/api/widgets/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update project");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects-counts"] });
      queryClient.invalidateQueries({ queryKey: ["projects-completions"] });
      if (variables.data.status === "COMPLETE") {
        setCompleteWindowIds((prev) => new Set(prev).add(variables.id));
        setTimeout(() => {
          setAnimatingOutIds((prev) => new Set(prev).add(variables.id));
          setTimeout(() => {
            setCompleteWindowIds((prev) => {
              const next = new Set(prev);
              next.delete(variables.id);
              return next;
            });
            setAnimatingOutIds((prev) => {
              const next = new Set(prev);
              next.delete(variables.id);
              return next;
            });
          }, 500);
        }, 5000);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/widgets/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete project");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects-counts"] });
      queryClient.invalidateQueries({ queryKey: ["projects-completions"] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (over == null || typeof over.id !== "string") return;
      if (!over.id.startsWith(COLUMN_ID_PREFIX)) return;
      const toColumnId = over.id.slice(COLUMN_ID_PREFIX.length);
      const fromStatus = active.data.current?.status as ProjectTodoStatus | undefined;
      if (!fromStatus || fromStatus === toColumnId) return;

      const todo = todos.find((t) => t.id === active.id);
      if (!todo) return;

      updateMutation.mutate({
        id: todo.id,
        data: { status: toColumnId as ProjectTodoStatus },
      });
    },
    [todos, updateMutation]
  );

  const handleAddTodo = () => {
    if (!newTodo.title.trim()) return;
    createMutation.mutate({
      title: newTodo.title.trim(),
      priority: newTodo.priority,
      status: newTodo.status,
    });
  };

  useEffect(() => {
    if (isExpanded && expandToView === "completions") {
      setView("completions");
      clearExpandToView?.();
    }
  }, [isExpanded, expandToView, clearExpandToView]);

  const priorityChartData = useMemo(() => {
    const byPriority: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    for (const c of completions) {
      const p = c.priority;
      if ([1, 2, 3].includes(p)) byPriority[p]++;
    }
    return [
      { name: "Priority 1", value: byPriority[1], fill: "#3b82f6" },
      { name: "Priority 2", value: byPriority[2], fill: "#10b981" },
      { name: "Priority 3", value: byPriority[3], fill: "#f59e0b" },
    ].filter((d) => d.value > 0);
  }, [completions]);

  const timeChartDataByPriority = useMemo(() => {
    const byPriority: Record<number, Record<string, number>> = {
      1: {},
      2: {},
      3: {},
    };
    for (const c of completions) {
      if (!c.completedAt) continue;
      const created = parseISO(c.createdAt);
      const completed = parseISO(c.completedAt);
      const label = quantizeDuration(created, completed);
      const p = c.priority;
      if ([1, 2, 3].includes(p)) {
        byPriority[p][label] = (byPriority[p][label] ?? 0) + 1;
      }
    }
    return {
      1: Object.entries(byPriority[1]).map(([name, count]) => ({ name, count })),
      2: Object.entries(byPriority[2]).map(([name, count]) => ({ name, count })),
      3: Object.entries(byPriority[3]).map(([name, count]) => ({ name, count })),
    };
  }, [completions]);

  const kanbanContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Kanban</h3>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-700"
        >
          {showAddForm ? "Cancel" : "Add Todo"}
        </button>
      </div>

      {showAddForm && (
        <div className="space-y-2 rounded bg-gray-700 p-3">
          <input
            type="text"
            placeholder="Project (title)"
            value={newTodo.title}
            onChange={(e) =>
              setNewTodo((t) => ({ ...t, title: e.target.value }))
            }
            className="w-full rounded bg-gray-600 px-3 py-2 text-sm"
            aria-label="Project title"
          />
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              Priority:
              <select
                value={newTodo.priority}
                onChange={(e) =>
                  setNewTodo((t) => ({
                    ...t,
                    priority: Number(e.target.value) as 1 | 2 | 3,
                  }))
                }
                className="rounded bg-gray-600 px-2 py-1"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              Status:
              <select
                value={newTodo.status}
                onChange={(e) =>
                  setNewTodo((t) => ({
                    ...t,
                    status: e.target.value as ProjectTodoStatus,
                  }))
                }
                className="rounded bg-gray-600 px-2 py-1"
              >
                <option value="NOT_READY">Not Ready</option>
                <option value="STARTING">Starting</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETE">Complete</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={handleAddTodo}
            disabled={!newTodo.title.trim() || createMutation.isPending}
            className="w-full rounded bg-green-600 px-3 py-2 text-sm hover:bg-green-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {columns.map((col, idx) => (
              <KanbanColumn
                key={col.id}
                columnId={col.id}
                label={col.label}
                color={col.color}
                previousColumnColors={columns.slice(0, idx).map((c) => c.color)}
                todos={todosByStatus[col.id] ?? []}
                onDelete={(id) => deleteMutation.mutate(id)}
                animatingOutIds={animatingOutIds}
              />
            ))}
          </div>
        </DndContext>
      )}

      <button
        type="button"
        onClick={() => setView("completions")}
        className="text-sm text-blue-400 hover:text-blue-300"
      >
        View Completions
      </button>
    </div>
  );

  const completionsContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Completions</h3>
        <button
          type="button"
          onClick={() => setView("kanban")}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          Back to kanban
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-700 pb-2">
        <button
          type="button"
          onClick={() => setCompletionsTab("list")}
          className={`rounded px-3 py-1 text-sm ${
            completionsTab === "list"
              ? "bg-gray-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Completions
        </button>
        <button
          type="button"
          onClick={() => setCompletionsTab("priority")}
          className={`rounded px-3 py-1 text-sm ${
            completionsTab === "priority"
              ? "bg-gray-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          By Priority
        </button>
        <button
          type="button"
          onClick={() => setCompletionsTab("time")}
          className={`rounded px-3 py-1 text-sm ${
            completionsTab === "time"
              ? "bg-gray-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          By Time
        </button>
      </div>

      {completionsTab === "list" && (
        <ul className="space-y-2">
          {completions.length === 0 ? (
            <li className="text-gray-400 text-sm">No completed projects yet.</li>
          ) : (
            completions.map((c) => {
              const initP = c.initialPriority ?? c.priority;
              const endP = c.priority;
              const priorityChange =
                initP !== endP
                  ? initP < endP
                    ? `${initP}↑${endP}`
                    : `${initP}↓${endP}`
                  : null;
              return (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-2 rounded bg-gray-700 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{c.title}</span>
                  <span className="text-gray-400">P{c.priority}</span>
                  {priorityChange && (
                    <span className="text-amber-400">{priorityChange}</span>
                  )}
                  <span className="text-gray-500">
                    Created: {format(parseISO(c.createdAt), "MMM d, yyyy")}
                  </span>
                  <span className="text-gray-500">
                    Completed: {c.completedAt && format(parseISO(c.completedAt), "MMM d, yyyy")}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      )}

      {completionsTab === "priority" && (
        <div className="h-64">
          {priorityChartData.length === 0 ? (
            <p className="text-gray-400 text-sm">No data for pie chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {priorityChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {completionsTab === "time" && (
        <div className="space-y-6">
          {([1, 2, 3] as const).map((p) => {
            const data = timeChartDataByPriority[p];
            if (!data || data.length === 0) return null;
            return (
              <div key={p}>
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  Priority {p} completions by duration
                </h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
          {[1, 2, 3].every(
            (p) => !timeChartDataByPriority[p as 1 | 2 | 3]?.length
          ) && (
            <p className="text-gray-400 text-sm">No duration data yet.</p>
          )}
        </div>
      )}
    </div>
  );

  const expandedBody = view === "completions" ? completionsContent : kanbanContent;

  const collapsedContent = (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase text-gray-400">
        Projects by column
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {columns.map((col) => (
          <span key={col.id}>
            {col.label}: {counts[col.id] ?? 0}
          </span>
        ))}
      </div>
      {onExpandToCompletions && (
        <button
          type="button"
          onClick={onExpandToCompletions}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          View Completions
        </button>
      )}
    </div>
  );

  return (
    <Widget
      title="Projects"
      expandedContent={expandedBody}
      isExpanded={isExpanded}
      onExpandToggle={onExpandToggle}
    >
      {collapsedContent}
    </Widget>
  );
}
