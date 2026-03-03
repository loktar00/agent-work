import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestApp } from "./helpers.js";
import type { FastifyInstance } from "fastify";
import type { DB } from "@agent-board/db";
import { secrets } from "@agent-board/db";
import { eq } from "drizzle-orm";

describe("Secrets", () => {
  let app: FastifyInstance;
  let db: DB;

  beforeEach(async () => {
    ({ app, db } = await createTestApp());
  });

  afterEach(async () => {
    await app.close();
  });

  it("should create a secret", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/secrets",
      payload: { name: "API_KEY", value: "super-secret-value" },
    });

    expect(res.statusCode).toBe(201);
    const secret = JSON.parse(res.body);
    expect(secret.name).toBe("API_KEY");
    expect(secret.id).toBeDefined();
    // The response should NOT contain the raw value
    expect(secret.value).toBeUndefined();
    expect(secret.encryptedValue).toBeUndefined();
  });

  it("should list secrets without exposing values", async () => {
    await app.inject({
      method: "POST",
      url: "/api/secrets",
      payload: { name: "KEY_1", value: "value1" },
    });
    await app.inject({
      method: "POST",
      url: "/api/secrets",
      payload: { name: "KEY_2", value: "value2" },
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/secrets",
    });

    expect(res.statusCode).toBe(200);
    const list = JSON.parse(res.body);
    expect(list).toHaveLength(2);
    // Should not include encrypted values in list
    for (const item of list) {
      expect(item.encryptedValue).toBeUndefined();
      expect(item.value).toBeUndefined();
    }
  });

  it("should store encrypted value in database (not plaintext)", async () => {
    const plainValue = "my-super-secret-api-key-12345";

    await app.inject({
      method: "POST",
      url: "/api/secrets",
      payload: { name: "CHECK_ENCRYPTED", value: plainValue },
    });

    // Query the DB directly
    const rows = db.select().from(secrets).where(eq(secrets.name, "CHECK_ENCRYPTED")).all();
    expect(rows).toHaveLength(1);
    const row = rows[0];

    // Encrypted value should NOT be the plaintext
    expect(row.encryptedValue).not.toBe(plainValue);
    expect(row.encryptedValue).not.toContain(plainValue);
    expect(row.iv).toBeDefined();
    expect(row.iv.length).toBeGreaterThan(0);
  });

  it("should delete a secret", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/api/secrets",
      payload: { name: "TO_DELETE", value: "delete-me" },
    });
    const secret = JSON.parse(createRes.body);

    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/api/secrets/${secret.id}`,
    });

    expect(deleteRes.statusCode).toBe(200);
    expect(JSON.parse(deleteRes.body).success).toBe(true);

    // Verify it's gone
    const listRes = await app.inject({
      method: "GET",
      url: "/api/secrets",
    });
    const list = JSON.parse(listRes.body);
    expect(list.find((s: { id: string }) => s.id === secret.id)).toBeUndefined();
  });

  it("should decrypt secret via service", async () => {
    const plainValue = "decryptable-secret-value";

    await app.inject({
      method: "POST",
      url: "/api/secrets",
      payload: { name: "DECRYPT_TEST", value: plainValue },
    });

    // Use the service directly to read back the decrypted value
    const decrypted = app.services.secrets.get("DECRYPT_TEST");
    expect(decrypted).toBe(plainValue);
  });
});
