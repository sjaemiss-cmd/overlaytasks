import type { Task } from "../types.js";

export type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { stringValue: string }
  | { bytesValue: string }
  | { referenceValue: string }
  | { geoPointValue: { latitude: number; longitude: number } }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

export interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
}

export interface TaskMetaFields {
  updatedAt: string;
  deletedAt?: string;
}

const asString = (value: FirestoreValue | undefined) =>
  value && "stringValue" in value ? value.stringValue : undefined;

const asTimestamp = (value: FirestoreValue | undefined) =>
  value && "timestampValue" in value ? value.timestampValue : undefined;

export const encodeTimestamp = (iso: string): FirestoreValue => ({ timestampValue: iso });

export const encodeString = (value: string): FirestoreValue => ({ stringValue: value });

export const encodeBoolean = (value: boolean): FirestoreValue => ({ booleanValue: value });

export const encodeStringArray = (values: string[]): FirestoreValue => ({
  arrayValue: { values: values.map((value) => ({ stringValue: value })) }
});

export const encodeTaskFields = (task: Task, meta: TaskMetaFields): Record<string, FirestoreValue> => ({
  title: encodeString(task.title),
  status: encodeString(task.status),
  deadline: encodeTimestamp(task.deadline),
  createdAt: encodeTimestamp(task.createdAt),
  updatedAt: encodeTimestamp(meta.updatedAt),
  ...(meta.deletedAt ? { deletedAt: encodeTimestamp(meta.deletedAt) } : {})
});

export const decodeTaskDocument = (doc: FirestoreDocument) => {
  const fields = doc.fields ?? {};
  const id = doc.name.split("/").pop();
  const title = asString(fields.title);
  const status = asString(fields.status);
  const deadline = asTimestamp(fields.deadline) ?? asString(fields.deadline);
  const createdAt = asTimestamp(fields.createdAt) ?? asString(fields.createdAt);
  const updatedAt = asTimestamp(fields.updatedAt) ?? asString(fields.updatedAt);
  const deletedAt = asTimestamp(fields.deletedAt) ?? asString(fields.deletedAt);

  if (!id || !title || !status || !deadline || !createdAt || !updatedAt) {
    return null;
  }

  const task: Task = {
    id,
    title,
    deadline,
    status: status as Task["status"],
    createdAt
  };

  const meta: TaskMetaFields = {
    updatedAt,
    ...(deletedAt ? { deletedAt } : {})
  };

  return { task, meta };
};
