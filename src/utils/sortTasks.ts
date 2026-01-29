import dayjs from "dayjs";
import type { SortMode, Task } from "../types";

export const sortTasks = (tasks: Task[], mode: SortMode) => {
  return [...tasks].sort((a, b) => {
    const aTime = dayjs(mode === "created" ? a.createdAt : a.deadline).valueOf();
    const bTime = dayjs(mode === "created" ? b.createdAt : b.deadline).valueOf();
    return aTime - bTime;
  });
};
