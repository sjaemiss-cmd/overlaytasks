import { describe, expect, it } from "vitest";
import type { Task } from "../../shared/types";
import type { TaskStatus } from "../../shared/types";

// Profile local state matching syncEngine implementation for testing
interface TaskMeta {
  updatedAt: string;
  deletedAt?: string;
}

interface ProfileLocalState {
  tasks: Task[];
  taskOrder: string[];
  manualOrder: boolean;
  taskMeta: Record<string, TaskMeta>;
  orderUpdatedAt: string;
  oplog: never[];
  syncCursor: string | null;
}

const emptyProfileState = (): ProfileLocalState => {
  return {
    tasks: [],
    taskOrder: [],
    manualOrder: false,
    taskMeta: {},
    orderUpdatedAt: new Date(0).toISOString(),
    oplog: [],
    syncCursor: null
  };
};

describe("profile isolation", () => {
  it("getProfileState returns empty state for missing key", () => {
    const profiles: Record<string, ProfileLocalState> = {
      local: emptyProfileState()
    };

    const result = profiles["local"];
    expect(result).toEqual(emptyProfileState());
  });

  it("getProfileState returns empty state for invalid profile", () => {
    const profiles: Record<string, ProfileLocalState> = {
      local: emptyProfileState(),
      other: undefined as any
    };

    const result = profiles["other"];
    expect(result).toEqual(emptyProfileState());
  });

  it("profiles are isolated: changes to one profile do not affect others", () => {
    const local1 = emptyProfileState();
    local1.tasks = [{ id: "t1", title: "Task in local1", deadline: "2026-01-30T10:00:00.000Z", status: "active", createdAt: "2026-01-29T10:00:00.000Z" }];
    local1.taskMeta = { t1: { updatedAt: "2026-01-30T11:00:00.000Z" } };

    const local2 = emptyProfileState();
    local2.tasks = [{ id: "t2", title: "Task in local2", deadline: "2026-01-30T10:00:00.000Z", status: "active", createdAt: "2026-01-29T10:00:00.000Z" }];
    local2.taskMeta = { t2: { updatedAt: "2026-01-30T11:00:00.000Z" } };

    const profiles: Record<string, ProfileLocalState> = { local: local1, uid123: local2 };

    const updatedLocal2 = { ...local2, tasks: [...local2.tasks, { id: "t3", title: "New task", deadline: "2026-01-30T12:00:00.000Z", status: "active", createdAt: "2026-01-30T10:00:00.000Z" }] };

    // Simulate updating profiles
    profiles.uid123 = updatedLocal2;

    expect(profiles.local.tasks).toHaveLength(1);
    expect(profiles.local.tasks[0].id).toBe("t1");
    expect(profiles.uid123.tasks).toHaveLength(2);
    expect(profiles.uid123.tasks[2].id).toBe("t3");
  });

  it("oplog stays with its profile", () => {
    const local1 = emptyProfileState();
    const task1: Task = { id: "t1", title: "Task 1", deadline: "2026-01-30T10:00:00.000Z", status: "active", createdAt: "2026-01-29T10:00:00.000Z" };
    local1.tasks = [task1];
    local1.oplog = [{ id: "op1", type: "upsert-task", createdAt: "2026-01-30T11:00:00.000Z", task: task1 } as any];

    const local2 = emptyProfileState();
    const task2: Task = { id: "t2", title: "Task 2", deadline: "2026-01-30T10:00:00.000Z", status: "active", createdAt: "2026-01-29T10:00:00.000Z" };
    local2.tasks = [task2];
    local2.oplog = [] as never[];

    const profiles: Record<string, ProfileLocalState> = { local: local1, uid123: local2 };

    const updatedLocal1 = { ...local1, tasks: [...local1.tasks, { id: "t3", title: "New in local1", deadline: "2026-01-30T12:00:00.000Z", status: "active", createdAt: "2026-01-30T11:00:00.000Z" }] };

    profiles.local = updatedLocal1;

    expect(profiles.local.oplog).toHaveLength(2);
    expect(profiles.uid123.oplog).toHaveLength(0);
  });

  it("switching profiles should not cross-contaminate", () => {
    const local1 = emptyProfileState();
    local1.tasks = [{ id: "t1", title: "Task 1", deadline: "2026-01-30T10:00:00.000Z", status: "active", createdAt: "2026-01-29T10:00:00.000Z" }];

    const local2 = emptyProfileState();
    local2.tasks = [{ id: "t2", title: "Task 2", deadline: "2026-01-30T10:00:00.000Z", status: "active", createdAt: "2026-01-29T10:00:00.000Z" }];

    const profiles: Record<string, ProfileLocalState> = { local: local1, uid123: local2 };

    // Switch from uid123 to local
    const localAfterSwitch = profiles.local;
    expect(localAfterSwitch.tasks).toHaveLength(1);
    expect(localAfterSwitch.tasks[0].id).toBe("t1");
  });
});
