import { describe, expect, it } from "vitest";
import type { Task } from "../../shared/types";
import { decodeTaskDocument, encodeTaskFields, encodeBoolean, encodeStringArray, encodeTimestamp } from "../../electron/firestore/value";

describe("firestore value codec", () => {
  it("encodes and decodes task with all fields", () => {
    const task: Task = {
      id: "task-1",
      title: "Test task",
      deadline: "2026-01-30T12:00:00.000Z",
      status: "active",
      createdAt: "2026-01-29T10:00:00.000Z"
    };
    const meta = { updatedAt: "2026-01-30T13:00:00.000Z", deletedAt: undefined };

    const encoded = encodeTaskFields(task, meta);
    expect(encoded.title).toEqual({ stringValue: task.title });
    expect(encoded.status).toEqual({ stringValue: task.status });
    expect(encoded.deadline).toEqual({ timestampValue: task.deadline });
    expect(encoded.createdAt).toEqual({ timestampValue: task.createdAt });
    expect(encoded.updatedAt).toEqual({ timestampValue: meta.updatedAt });
  });

  it("encodes tombstone delete", () => {
    const task: Task = {
      id: "task-2",
      title: "To delete",
      deadline: "2026-01-30T13:00:00.000Z",
      status: "completed",
      createdAt: "2026-01-29T11:00:00.000Z"
    };
    const meta = { updatedAt: "2026-01-30T13:00:00.000Z", deletedAt: "2026-01-30T14:00:00.000Z" };

    const encoded = encodeTaskFields(task, meta);
    expect(encoded.deletedAt).toEqual({ timestampValue: meta.deletedAt });
  });

  it("decodes Firestore document with valid fields", () => {
    const doc = {
      name: "projects/my-project/databases/(default)/documents/users/uid123/tasks/task-1",
      fields: {
        title: { stringValue: "Test task" },
        status: { stringValue: "active" },
        deadline: { timestampValue: "2026-01-30T12:00:00.000Z" },
        createdAt: { timestampValue: "2026-01-29T10:00:00.000Z" },
        updatedAt: { timestampValue: "2026-01-30T13:00:00.000Z" }
      }
    };

    const result = decodeTaskDocument(doc);
    expect(result).not.toBeNull();

    if (!result) return;

    expect(result.task.id).toBe("task-1");
    expect(result.task.title).toBe("Test task");
    expect(result.task.deadline).toBe("2026-01-30T12:00:00.000Z");
    expect(result.task.status).toBe("active");
    expect(result.task.createdAt).toBe("2026-01-29T10:00:00.000Z");
    expect(result.meta.updatedAt).toBe("2026-01-30T13:00:00.000Z");
  });

  it("decodes Firestore document with tombstone", () => {
    const doc = {
      name: "projects/my-project/databases/(default)/documents/users/uid123/tasks/task-2",
      fields: {
        title: { stringValue: "To delete" },
        status: { stringValue: "completed" },
        deadline: { timestampValue: "2026-01-30T13:00:00.000Z" },
        createdAt: { timestampValue: "2026-01-29T11:00:00.000Z" },
        updatedAt: { timestampValue: "2026-01-30T13:00:00.000Z" },
        deletedAt: { timestampValue: "2026-01-30T14:00:00.000Z" }
      }
    };

    const result = decodeTaskDocument(doc);
    expect(result).not.toBeNull();

    if (!result) return;

    expect(result.task.id).toBe("task-2");
    expect(result.meta.deletedAt).toBe("2026-01-30T14:00:00.000Z");
  });

  it("returns null for missing required fields", () => {
    const doc = {
      name: "projects/my-project/databases/(default)/documents/users/uid123/tasks/task-3",
      fields: {}
    };

    const result = decodeTaskDocument(doc);
    expect(result).toBeNull();
  });
});
