import { randomBytes } from "node:crypto";

export function newId(): string {
  return randomBytes(12).toString("hex");
}

export function now(): string {
  return new Date().toISOString();
}
