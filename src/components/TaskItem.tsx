import dayjs from "dayjs";
import { useState } from "react";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import type { Task, TaskStatus } from "../types";
import { formatDeadline, minutesUntil } from "../utils/time";
import { cn } from "../utils/ui";

interface TaskItemProps {
  task: Task;
  now: dayjs.Dayjs;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onUpdateTask: (id: string, updates: { title?: string; deadline?: string }) => void;
  onRemove: (id: string) => void;
  labels: {
    deadline: string;
    timeRemaining: string;
    minLeft: string;
    expired: string;
    delete: string;
    edit: string;
    holdAction: string;
    resume: string;
    restore: string;
    complete: string;
  };
  dragHandleProps?: {
    listeners: DraggableSyntheticListeners | undefined;
    attributes: Record<string, string>;
    setActivatorNodeRef: (node: HTMLElement | null) => void;
  };
}

const getUrgencyClass = (minutesLeft: number) => {
  if (minutesLeft < 0) return "bg-red-900/70 text-red-100";
  if (minutesLeft <= 15) return "bg-red-800/70 text-red-50 animate-glow";
  if (minutesLeft <= 30) return "bg-red-600/70 text-red-50";
  if (minutesLeft <= 60) return "bg-orange-500/70 text-orange-50";
  if (minutesLeft <= 120) return "bg-yellow-400/70 text-slate-900";
  return "bg-slate-700/60 text-slate-100";
};

const getStatusClass = (status: TaskStatus) => {
  if (status === "completed") return "opacity-55 line-through";
  if (status === "on-hold") return "opacity-80";
  return "";
};

const TaskItem = ({
  task,
  now,
  onStatusChange,
  onUpdateTask,
  onRemove,
  labels,
  dragHandleProps
}: TaskItemProps) => {
  const minutesLeft = minutesUntil(task.deadline, now);
  const isExpired = minutesLeft < 0;
  const thresholdMinutes = 1440;
  const progress = Math.max(0, Math.min(100, (minutesLeft / thresholdMinutes) * 100));
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [draftDeadline, setDraftDeadline] = useState(
    dayjs(task.deadline).format("YYYY-MM-DDTHH:mm")
  );

  const startEdit = () => {
    setDraftTitle(task.title);
    setDraftDeadline(dayjs(task.deadline).format("YYYY-MM-DDTHH:mm"));
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const saveEdit = () => {
    const nextTitle = draftTitle.trim();
    if (!nextTitle) return;
    const parsed = dayjs(draftDeadline);
    if (!parsed.isValid()) return;
    onUpdateTask(task.id, { title: nextTitle, deadline: parsed.toISOString() });
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 px-4 py-4 shadow-lg",
        getUrgencyClass(minutesLeft),
        getStatusClass(task.status)
      )}
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em]">
        <div className="flex items-center gap-2">
          {dragHandleProps ? (
            <button
              type="button"
              ref={dragHandleProps.setActivatorNodeRef}
              className="no-drag inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 text-[10px] font-semibold text-slate-100/80 transition hover:bg-white/10"
              {...dragHandleProps.attributes}
              {...dragHandleProps.listeners}
              aria-label="Drag task"
            />
          ) : null}
          <span className="text-slate-200/80">{labels.deadline}</span>
        </div>
        <span className="font-semibold">{formatDeadline(task.deadline)}</span>
      </div>
      {isEditing ? (
        <div className="mt-3 grid gap-2">
          <input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            className="accent-focus no-drag w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-slate-100 outline-none transition"
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="datetime-local"
              value={draftDeadline}
              onChange={(event) => setDraftDeadline(event.target.value)}
              className="accent-focus no-drag rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-slate-100 outline-none transition"
            />
            <button
              type="button"
              className="no-drag rounded-full border border-white/25 px-3 py-1 text-xs text-slate-100 transition hover:bg-white/10"
              onClick={cancelEdit}
            >
              Cancel
            </button>
            <button
              type="button"
              className="accent-button no-drag rounded-full border border-white/25 px-3 py-1 text-xs text-slate-100 transition"
              onClick={saveEdit}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-lg font-semibold text-slate-50">{task.title}</div>
      )}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-slate-200/70">
        <span>{labels.timeRemaining}</span>
          <span>{Math.max(0, minutesLeft)} min</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-300/80 via-yellow-300/80 to-red-400/80 transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-200/80">
        <span>
          {minutesLeft >= 0 ? `${minutesLeft} ${labels.minLeft}` : labels.expired}
        </span>
        <div className="flex items-center gap-2">
          {isEditing ? null : (
            <>
              <button
                type="button"
                className="no-drag rounded-full border border-white/20 px-3 py-1 text-xs text-slate-100 transition hover:bg-white/10"
                onClick={() => onRemove(task.id)}
              >
                {labels.delete}
              </button>
              <button
                type="button"
                className="no-drag rounded-full border border-white/20 px-3 py-1 text-xs text-slate-100 transition hover:bg-white/10"
                onClick={startEdit}
              >
                {labels.edit}
              </button>
              {task.status === "active" ? (
                <button
                  type="button"
                  className="no-drag rounded-full border border-white/20 px-3 py-1 text-xs text-slate-100 transition hover:bg-white/10"
                  onClick={() => onStatusChange(task.id, "on-hold")}
                >
                  {labels.holdAction}
                </button>
              ) : null}
              {task.status === "on-hold" ? (
                <button
                  type="button"
                  className="no-drag rounded-full border border-white/20 px-3 py-1 text-xs text-slate-100 transition hover:bg-white/10"
                  onClick={() => onStatusChange(task.id, "active")}
                >
                  {labels.resume}
                </button>
              ) : null}
              {task.status === "completed" ? (
                <button
                  type="button"
                  className="no-drag rounded-full border border-white/20 px-3 py-1 text-xs text-slate-100 transition hover:bg-white/10"
                  onClick={() => onStatusChange(task.id, "active")}
                >
                  {labels.restore}
                </button>
              ) : null}
              {!isExpired && task.status !== "completed" ? (
                <button
                  type="button"
                  className="no-drag rounded-full border border-white/20 px-3 py-1 text-xs text-slate-100 transition hover:bg-white/10"
                  onClick={() => onStatusChange(task.id, "completed")}
                >
                  {labels.complete}
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
      {isExpired && task.status !== "completed" ? (
        <div className="no-drag mt-3 flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/25"
            onClick={() => onStatusChange(task.id, "completed")}
          >
            Complete
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl bg-black/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-black/55"
            onClick={() => onStatusChange(task.id, "on-hold")}
          >
            Hold
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default TaskItem;
