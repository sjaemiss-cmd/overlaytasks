import { describe, expect, it } from "vitest";
import { sortTasks } from "./sortTasks";
import type { Task } from "../types";

const makeTask = (overrides: Partial<Task>): Task => ({
  id: overrides.id ?? "id",
  title: overrides.title ?? "t",
  deadline: overrides.deadline ?? "2026-01-01T00:00:00.000Z",
  status: overrides.status ?? "active",
  createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z"
});

describe("sortTasks", () => {
  it("sorts by deadline ascending", () => {
    const tasks = [
      makeTask({ id: "b", deadline: "2026-01-02T00:00:00.000Z" }),
      makeTask({ id: "a", deadline: "2026-01-01T00:00:00.000Z" })
    ];
    expect(sortTasks(tasks, "deadline").map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("sorts by createdAt ascending", () => {
    const tasks = [
      makeTask({ id: "b", createdAt: "2026-01-02T00:00:00.000Z" }),
      makeTask({ id: "a", createdAt: "2026-01-01T00:00:00.000Z" })
    ];
    expect(sortTasks(tasks, "created").map((t) => t.id)).toEqual(["a", "b"]);
  });
});
