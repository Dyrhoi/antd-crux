import { env } from "node:process";
const isDev = env.NODE_ENV !== "production";

export function warning(message: string): void {
  if (isDev) {
    console.warn(`[antd-crux] ${message}`);
  }
}
