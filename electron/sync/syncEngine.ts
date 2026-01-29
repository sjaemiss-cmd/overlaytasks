import crypto from "node:crypto";
import type { Task } from "../types.js";
import { refreshFirebaseSession } from "../auth/firebaseSession.js";
import { decryptFromBase64, encryptToBase64 } from "../auth/tokenStore.js";
import type { TaskMetaFields } from "../firestore/value.js";
import { FirestoreRestClient } from "../firestore/client.js";

export type SyncOpType = "upsert-task" | "delete-task" | "set-order";

export interface SyncOpBase {
  id: string;
  type: SyncOpType;
  createdAt: string;
}

export interface UpsertTaskOp extends SyncOpBase {
  type: "upsert-task";
  task: Task;
}

export interface DeleteTaskOp extends SyncOpBase {
  type: "delete-task";
  taskId: string;
}

export interface SetOrderOp extends SyncOpBase {
  type: "set-order";
  order: string[];
  manualOrder: boolean;
}

export type SyncOp = UpsertTaskOp | DeleteTaskOp | SetOrderOp;

export interface TaskMeta {
  updatedAt: string;
  deletedAt?: string;
}

export interface ProfileLocalState {
  tasks: Task[];
  taskOrder: string[];
  manualOrder: boolean;
  taskMeta: Record<string, TaskMeta>;
  orderUpdatedAt: string;
  oplog: SyncOp[];
  syncCursor: string | null;
}

export interface SyncEngineDeps {
  getCloudConfig: () => { firebaseProjectId: string; firebaseWebApiKey: string };
  getDeviceId: () => string;

  getRefreshTokenEncryptedBase64: (uid: string) => string | undefined;
  setRefreshTokenEncryptedBase64: (uid: string, value: string) => void;

  getActiveIdToken: () => { uid: string; idToken: string; expiresAt: string } | null;
  setActiveIdToken: (value: { uid: string; idToken: string; expiresAt: string } | null) => void;

  getProfileState: (profileKey: string) => ProfileLocalState;
  setProfileState: (profileKey: string, state: ProfileLocalState) => void;
  onTasksChanged: () => void;
}

const nowIso = () => new Date().toISOString();

const normalizeIso = (value: string | null | undefined) => (typeof value === "string" && value.length > 0 ? value : new Date(0).toISOString());

const isDifferentTask = (a: Task, b: Task) =>
  a.title !== b.title || a.deadline !== b.deadline || a.status !== b.status || a.createdAt !== b.createdAt;

export const buildOpsFromTaskSet = (prev: Task[], next: Task[], now: string) => {
  const ops: SyncOp[] = [];
  const prevById = new Map(prev.map((t) => [t.id, t] as const));
  const nextById = new Map(next.map((t) => [t.id, t] as const));

  for (const task of next) {
    const before = prevById.get(task.id);
    if (!before || isDifferentTask(before, task)) {
      ops.push({ id: crypto.randomUUID(), type: "upsert-task", createdAt: now, task });
    }
  }
  for (const task of prev) {
    if (!nextById.has(task.id)) {
      ops.push({ id: crypto.randomUUID(), type: "delete-task", createdAt: now, taskId: task.id });
    }
  }

  return ops;
};

export const createSyncEngine = (deps: SyncEngineDeps) => {
  const ensureIdToken = async (uid: string) => {
    const active = deps.getActiveIdToken();
    const expiryMs = active ? Date.parse(active.expiresAt) : 0;
    if (active && active.uid === uid && expiryMs - Date.now() > 60_000) {
      return active.idToken;
    }

    const encrypted = deps.getRefreshTokenEncryptedBase64(uid);
    if (!encrypted) {
      throw new Error("missing refresh token");
    }
    const refreshToken = decryptFromBase64(encrypted);
    const cfg = deps.getCloudConfig();
    const refreshed = await refreshFirebaseSession({
      firebaseWebApiKey: cfg.firebaseWebApiKey,
      refreshToken
    });
    deps.setRefreshTokenEncryptedBase64(uid, encryptToBase64(refreshed.refreshToken));
    deps.setActiveIdToken({ uid, idToken: refreshed.idToken, expiresAt: refreshed.expiresAt });
    return refreshed.idToken;
  };

  const createClient = (uid: string) => {
    const cfg = deps.getCloudConfig();
    return new FirestoreRestClient(
      { projectId: cfg.firebaseProjectId },
      async () => await ensureIdToken(uid)
    );
  };

  const pushOps = async (uid: string, state: ProfileLocalState) => {
    if (state.oplog.length === 0) {
      return { nextState: state, didPush: false };
    }

    const client = createClient(uid);
    const nextState: ProfileLocalState = { ...state, oplog: [...state.oplog] };
    const meta = { ...nextState.taskMeta };
    const now = nowIso();

    for (const op of nextState.oplog) {
      if (op.type === "upsert-task") {
        meta[op.task.id] = { updatedAt: now };
        await client.upsertTask(uid, op.task, meta[op.task.id] as TaskMetaFields);
      } else if (op.type === "delete-task") {
        meta[op.taskId] = { updatedAt: now, deletedAt: now };
        await client.tombstoneTask(uid, op.taskId, now);
      } else if (op.type === "set-order") {
        nextState.orderUpdatedAt = now;
        await client.setOrder(uid, { order: op.order, manualOrder: op.manualOrder, updatedAt: now });
      }
    }

    nextState.taskMeta = meta;
    nextState.oplog = [];
    return { nextState, didPush: true };
  };

  const pullDeltas = async (uid: string, state: ProfileLocalState) => {
    const client = createClient(uid);
    const cursor = normalizeIso(state.syncCursor);
    const deltas = await client.queryTaskDeltas(uid, cursor, 200);

    if (deltas.length === 0) {
      return { nextState: state, didApply: false };
    }

    const tasksById = new Map(state.tasks.map((t) => [t.id, t] as const));
    const metaById = { ...state.taskMeta };
    let maxCursor = cursor;
    let changed = false;

    for (const { task, meta } of deltas) {
      const localMeta = metaById[task.id];
      const localUpdatedAt = normalizeIso(localMeta?.updatedAt);
      const remoteUpdatedAt = normalizeIso(meta.updatedAt);

      if (remoteUpdatedAt > maxCursor) {
        maxCursor = remoteUpdatedAt;
      }

      if (remoteUpdatedAt <= localUpdatedAt) {
        continue;
      }

      metaById[task.id] = { updatedAt: remoteUpdatedAt, ...(meta.deletedAt ? { deletedAt: meta.deletedAt } : {}) };

      if (meta.deletedAt) {
        if (tasksById.has(task.id)) {
          tasksById.delete(task.id);
          changed = true;
        }
        continue;
      }

      tasksById.set(task.id, task);
      changed = true;
    }

    const nextTasks = Array.from(tasksById.values());
    const nextState: ProfileLocalState = {
      ...state,
      tasks: nextTasks,
      taskMeta: metaById,
      syncCursor: maxCursor
    };

    return { nextState, didApply: changed };
  };

  const tick = async (profileKey: string) => {
    if (profileKey === "local") return;
    const state = deps.getProfileState(profileKey);
    const pushed = await pushOps(profileKey, state);
    deps.setProfileState(profileKey, pushed.nextState);

    const pulled = await pullDeltas(profileKey, deps.getProfileState(profileKey));
    deps.setProfileState(profileKey, pulled.nextState);

    if (pushed.didPush || pulled.didApply) {
      deps.onTasksChanged();
    }
  };

  return { tick, buildOpsFromTaskSet };
};
