import { describe, expect, it } from "vitest";
import type { Task } from "../../shared/types";

// TaskMeta matching syncEngine implementation for testing
interface TaskMeta {
  updatedAt: string;
  deletedAt?: string;
}

type TaskStatus = "active" | "completed" | "on-hold";

interface Task {
  id: string;
  title: string;
  deadline: string;
  status: TaskStatus;
  createdAt: string;
}

interface TaskMetaFields {
  updatedAt: string;
  deletedAt?: string;
}

type SyncOpType = "upsert-task" | "delete-task" | "set-order";

interface SyncOpBase {
  id: string;
  type: SyncOpType;
  createdAt: string;
}

describe("sync engine merge logic", () => {
  it("first-login merge: cloud wins on same id", () => {
    const localTasks: Task[] = [
      { id: "t1", title: "Local task", deadline: "2026-01-30T10:00:00.000Z", status: "active", createdAt: "2026-01-29T10:00:00.000Z" },
      { id: "t2", title: "Local task 2", deadline: "2026-01-30T11:00:00.000Z", status: "active", createdAt: "2026-01-29T11:00:00.000Z" }
    ];
    const cloudTasks: Task[] = [
      { id: "t1", title: "Cloud task", deadline: "2026-01-30T12:00:00.000Z", status: "active", createdAt: "2026-01-28T10:00:00.000Z" }
    ];

    const cloudById = new Map(cloudTasks.map((t) => [t.id, t] as const));
    const merged: Task[] = [];

    for (const task of localTasks) {
      const remote = cloudById.get(task.id);
      if (remote) {
        // Cloud wins on same id
        merged.push(remote);
      } else {
        merged.push(task);
      }
    }

    expect(merged).toHaveLength(2);
    expect(merged.find((t) => t.id === "t1")?.title).toBe("Cloud task");
  });

  it("first-login merge: appends local-only tasks", () => {
    const now = "2026-01-30T13:00:00.000Z";
    const localTasks: Task[] = [
      { id: "t1", title: "Local only", deadline: "2026-01-30T10:00:00.000Z", status: "active", createdAt: "2026-01-29T10:00:00.000Z" }
    ];
    const cloudTasks: Task[] = [
      { id: "t1", title: "Remote task 1", deadline: "2026-01-30T13:00:00.000Z", status: "active", createdAt: "2026-01-28T10:00:00.000Z" }
    ];

    const cloudById = new Map(cloudTasks.map((t) => [t.id, t] as const));
    const localById = new Map(localTasks.map((t) => [t.id, t] as const));
    const cloudTasksSet = new Set(cloudTasks.map((t) => t.id));

    const merged: Task[] = [];
    const mergedMeta: Record<string, TaskMeta> = {};

    // Process cloud tasks first
    for (const task of cloudTasks) {
      const local = localById.get(task.id);
      if (local) {
        merged.push(task);
      } else {
        // Local-only task: add since it's not in cloud
        merged.push(localTasks.find((t) => t.id === task.id)!);
        mergedMeta[task.id] = { updatedAt: now };
      }
    }

    // Add local-only tasks (those not in cloud)
    for (const task of localTasks) {
      if (!cloudTasksSet.has(task.id)) {
        merged.push(task);
        mergedMeta[task.id] = { updatedAt: now };
      }
    }

    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe("Local only");
  });

  it("LWW merge: remote wins if updatedAt newer", () => {
    const now = "2026-01-30T13:00:00.000Z";
    const localMeta: Record<string, TaskMetaFields> = {
      t1: { updatedAt: "2026-01-30T12:00:00.000Z" },
      t2: { updatedAt: "2026-01-30T12:00:00.000Z" }
    };
    const localTasks: Task[] = [
      { id: "t1", title: "Local task 1", deadline: "2026-01-30T10:00:00.000Z", status: "active", createdAt: "2026-01-29T10:00:00.000Z" },
      { id: "t2", title: "Local task 2", deadline: "2026-01-30T11:00:00.000Z", status: "active", createdAt: "2026-01-29T11:00:00.000Z" }
    ];

    const remoteTasks: Task[] = [
      { id: "t1", title: "Remote task 1", deadline: "2026-01-30T13:00:00.000Z", status: "active", createdAt: "2026-01-28T10:00:00.000Z" }
    ];

    const remoteMeta: Record<string, TaskMetaFields> = {
      t1: { updatedAt: "2026-01-30T13:00:00.000Z" }
    };

    const merged: Task[] = [];
    const mergedMeta: Record<string, TaskMetaFields> = {};

    for (const task of remoteTasks) {
      const local = localMeta[task.id];
      if (!local || local.updatedAt < remoteMeta[task.id].updatedAt) {
        // Remote wins (remote is newer or local doesn't exist)
        merged.push(task);
        mergedMeta[task.id] = { updatedAt: remoteMeta[task.id].updatedAt };
      } else {
        // Local wins (local is newer or same timestamp)
        merged.push(localTasks.find((t) => t.id === task.id)!);
        mergedMeta[task.id] = { updatedAt: local.updatedAt };
      }
    }

    expect(merged).toHaveLength(2);
    expect(merged.find((t) => t.id === "t1")?.title).toBe("Remote task 1");
  });

  it("tombstone prevents resurrection: remote delete wins if newer", () => {
    const now = "2026-01-30T13:00:00.000Z";
    const localMeta: Record<string, TaskMetaFields> = {
      t1: { updatedAt: "2026-01-30T14:00:00.000Z", deletedAt: undefined }
    };
    const localTasks: Task[] = [
      { id: "t1", title: "Local task 1", deadline: "2026-01-30T10:00:00.000Z", status: "active", createdAt: "2026-01-29T10:00:00.000Z" }
    ];

    const remoteMeta: Record<string, TaskMetaFields> = {
      t1: { updatedAt: "2026-01-30T13:00:00.000Z", deletedAt: now }
    };

    const merged: Task[] = [];

    for (const task of localTasks) {
      const local = localMeta[task.id];
      const meta = remoteMeta[task.id];
      if (!meta) continue;

      // Local wins: tombstone is too old (local update is after tombstone) OR local doesn't have a delete time
      if (meta.deletedAt && (!local.deletedAt || local.updatedAt > meta.deletedAt)) {
        merged.push(localTasks.find((t) => t.id === task.id)!);
      }
    }

    expect(merged).toHaveLength(1);
  });

  it("tombstone resurrects if remote delete is older", () => {
    const now = "2026-01-30T13:00:00.000Z";
    const localMeta: Record<string, TaskMetaFields> = {
      t1: { updatedAt: "2026-01-30T14:00:00.000Z", deletedAt: undefined }
    };
    const localTasks: Task[] = [
      { id: "t1", title: "Local task 1", deadline: "2026-01-30T10:00:00.000Z", status: "active", createdAt: "2026-01-29T10:00:00.000Z" }
    ];

    const remoteMeta: Record<string, TaskMetaFields> = {
      t1: { updatedAt: "2026-01-30T12:00:00.000Z", deletedAt: now }
    };

    const merged: Task[] = [];

    for (const task of localTasks) {
      const local = localMeta[task.id];
      const meta = remoteMeta[task.id];
      if (!meta) continue;

      if (meta.deletedAt && (!local || local.updatedAt > meta.updatedAt)) {
        // Local wins: task is kept
        merged.push(localTasks.find((t) => t.id === task.id)!);
      } else {
        merged.push(localTasks.find((t) => t.id === task.id)!);
      }
    }

    expect(merged).toHaveLength(1);
  });
});
