import { eq } from "drizzle-orm";
import { secrets } from "@agent-board/db";
import type { DB } from "@agent-board/db";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { newId, now } from "../utils.js";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const passphrase =
    process.env.AGENT_BOARD_SECRET_KEY || "agent-board-default-key";
  return scryptSync(passphrase, "agent-board-salt", 32);
}

function encrypt(text: string): { encrypted: string; iv: string } {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf-8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return { encrypted: encrypted + ":" + tag, iv: iv.toString("hex") };
}

function decrypt(encrypted: string, ivHex: string): string {
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const [data, tagHex] = encrypted.split(":");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  let decrypted = decipher.update(data, "hex", "utf-8");
  decrypted += decipher.final("utf-8");
  return decrypted;
}

export function secretService(db: DB) {
  return {
    list() {
      return db
        .select({ id: secrets.id, name: secrets.name, createdAt: secrets.createdAt })
        .from(secrets)
        .all();
    },

    create(name: string, value: string) {
      const id = newId();
      const ts = now();
      const { encrypted, iv } = encrypt(value);
      const row = {
        id,
        name,
        encryptedValue: encrypted,
        iv,
        createdAt: ts,
      };
      db.insert(secrets).values(row).run();
      return { id, name, createdAt: ts };
    },

    get(name: string): string | null {
      const row = db
        .select()
        .from(secrets)
        .where(eq(secrets.name, name))
        .get();
      if (!row) return null;
      return decrypt(row.encryptedValue, row.iv);
    },

    delete(id: string) {
      const existing = db
        .select()
        .from(secrets)
        .where(eq(secrets.id, id))
        .get();
      if (!existing) return false;
      db.delete(secrets).where(eq(secrets.id, id)).run();
      return true;
    },
  };
}
