import { create } from "zustand";
import type { Task, TaskStatus } from "../types";

interface TaskState {
  tasks: Task[];
  manualOrder: boolean;
  order: string[];
  autoSave: boolean;
  hydrateTasks: (tasks: Task[]) => void;
  hydrateOrder: (order: string[], manualOrder: boolean) => void;
  setAutoSave: (autoSave: boolean) => void;
  addTask: (task: Task) => void;
  updateStatus: (id: string, status: TaskStatus) => void;
  updateTask: (id: string, updates: { title?: string; deadline?: string }) => void;
  removeTask: (id: string) => void;
  setOrder: (order: string[]) => void;
  resetOrder: () => void;
  resetLocal: () => void;
}

const persistTasks = async (tasks: Task[]) => {
  if (window.api) {
    await window.api.saveTasks(tasks);
  }
};

const persistOrder = async (order: string[], manualOrder: boolean) => {
  if (window.api) {
    await window.api.saveTaskOrder({ order, manualOrder });
  }
};

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  manualOrder: false,
  order: [],
  autoSave: true,
  hydrateTasks: (tasks) => {
    set({ tasks });
  },
  hydrateOrder: (order, manualOrder) => {
    set({ order, manualOrder });
  },
  setAutoSave: (autoSave) => {
    set({ autoSave });
  },
  addTask: (task) => {
    const current = get();
    const nextTasks = [...current.tasks, task];
    const nextOrder = current.manualOrder ? [...current.order, task.id] : current.order;
    set({ tasks: nextTasks, order: nextOrder });
    if (current.autoSave) {
      void persistTasks(nextTasks);
      if (current.manualOrder) {
        void persistOrder(nextOrder, true);
      }
    }
  },
  updateStatus: (id, status) => {
    const next = get().tasks.map((task) =>
      task.id === id ? { ...task, status } : task
    );
    set({ tasks: next });
    if (get().autoSave) {
      void persistTasks(next);
    }
  },
  updateTask: (id, updates) => {
    const next = get().tasks.map((task) =>
      task.id === id ? { ...task, ...updates } : task
    );
    set({ tasks: next });
    if (get().autoSave) {
      void persistTasks(next);
    }
  },
  removeTask: (id) => {
    const current = get();
    const nextTasks = current.tasks.filter((task) => task.id !== id);
    const nextOrder = current.order.filter((taskId) => taskId !== id);
    set({ tasks: nextTasks, order: nextOrder });
    if (current.autoSave) {
      void persistTasks(nextTasks);
      if (current.manualOrder) {
        void persistOrder(nextOrder, current.manualOrder);
      }
    }
  },
  setOrder: (order) => {
    set({ order, manualOrder: true });
    if (get().autoSave) {
      void persistOrder(order, true);
    }
  },
  resetOrder: () => {
    set({ manualOrder: false, order: [] });
    if (get().autoSave) {
      void persistOrder([], false);
    }
  },
  resetLocal: () => {
    set({ tasks: [], manualOrder: false, order: [] });
  }
}));
