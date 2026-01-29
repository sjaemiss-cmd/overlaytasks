import type { Task } from "../types.js";
import type { FirestoreDocument, FirestoreValue, TaskMetaFields } from "./value.js";
import {
  decodeTaskDocument,
  encodeBoolean,
  encodeStringArray,
  encodeTaskFields,
  encodeTimestamp
} from "./value.js";

export interface FirestoreClientConfig {
  projectId: string;
  databaseId?: string;
}

const databaseIdOrDefault = (databaseId?: string) => (databaseId && databaseId.length > 0 ? databaseId : "(default)");

const databaseRoot = (cfg: FirestoreClientConfig) =>
  `projects/${cfg.projectId}/databases/${databaseIdOrDefault(cfg.databaseId)}`;

const documentsRoot = (cfg: FirestoreClientConfig) => `${databaseRoot(cfg)}/documents`;

export const taskDocName = (cfg: FirestoreClientConfig, uid: string, taskId: string) =>
  `${documentsRoot(cfg)}/users/${uid}/tasks/${taskId}`;

export const orderDocName = (cfg: FirestoreClientConfig, uid: string) =>
  `${documentsRoot(cfg)}/users/${uid}/meta/order`;

export class FirestoreRestClient {
  constructor(
    private cfg: FirestoreClientConfig,
    private getIdToken: () => Promise<string>
  ) {}

  private async request<T>(url: string, body: unknown): Promise<T> {
    const idToken = await this.getIdToken();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${idToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`firestore request failed: ${response.status} ${text}`);
    }

    return (await response.json()) as T;
  }

  async commit(writes: unknown[]) {
    const url = `https://firestore.googleapis.com/v1/${databaseRoot(this.cfg)}/documents:commit`;
    return await this.request(url, { writes });
  }

  async upsertTask(uid: string, task: Task, meta: TaskMetaFields) {
    const name = taskDocName(this.cfg, uid, task.id);
    return await this.commit([
      {
        update: {
          name,
          fields: encodeTaskFields(task, meta)
        }
      }
    ]);
  }

  async tombstoneTask(uid: string, taskId: string, deletedAt: string) {
    const name = taskDocName(this.cfg, uid, taskId);
    return await this.commit([
      {
        update: {
          name,
          fields: { deletedAt: encodeTimestamp(deletedAt), updatedAt: encodeTimestamp(deletedAt) }
        },
        updateMask: { fieldPaths: ["deletedAt", "updatedAt"] }
      }
    ]);
  }

  async setOrder(uid: string, input: { order: string[]; manualOrder: boolean; updatedAt: string }) {
    const name = orderDocName(this.cfg, uid);
    const fields: Record<string, FirestoreValue> = {
      order: encodeStringArray(input.order),
      manualOrder: encodeBoolean(input.manualOrder),
      updatedAt: encodeTimestamp(input.updatedAt)
    };
    return await this.commit([
      {
        update: {
          name,
          fields
        }
      }
    ]);
  }

  async queryTaskDeltas(uid: string, sinceUpdatedAt: string, limit: number) {
    const parent = `${documentsRoot(this.cfg)}/users/${uid}`;
    const url = `https://firestore.googleapis.com/v1/${parent}:runQuery`;

    const response = await this.request<
      Array<{
        document?: FirestoreDocument;
        readTime?: string;
        skippedResults?: number;
        done?: boolean;
      }>
    >(url, {
      structuredQuery: {
        from: [{ collectionId: "tasks" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "updatedAt" },
            op: "GREATER_THAN",
            value: { timestampValue: sinceUpdatedAt }
          }
        },
        orderBy: [{ field: { fieldPath: "updatedAt" }, direction: "ASCENDING" }],
        limit
      }
    });

    const decoded = [] as Array<{ task: Task; meta: TaskMetaFields }>;
    for (const row of response) {
      if (!row.document) continue;
      const parsed = decodeTaskDocument(row.document);
      if (!parsed) continue;
      decoded.push(parsed);
    }
    return decoded;
  }

  async queryAllTasks(uid: string) {
    const out: Array<{ task: Task; meta: TaskMetaFields }> = [];
    let cursor = new Date(0).toISOString();

    for (let i = 0; i < 50; i += 1) {
      const batch = await this.queryTaskDeltas(uid, cursor, 200);
      if (batch.length === 0) {
        break;
      }
      out.push(...batch);
      cursor = batch[batch.length - 1].meta.updatedAt;
    }

    return out;
  }
}
