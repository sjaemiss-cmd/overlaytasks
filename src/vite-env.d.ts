/// <reference types="vite/client" />
import type { IpcApi } from "./types";

declare global {
  interface Window {
    api: IpcApi;
  }
}

export {};
