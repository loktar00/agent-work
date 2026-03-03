import Database, { type Database as SQLiteDatabase } from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema/index.ts";

export function createConnection(dbPath: string): {
  db: BetterSQLite3Database<typeof schema>;
  sqlite: SQLiteDatabase;
} {
  const sqlite = new Database(dbPath);

  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  const db = drizzle(sqlite, { schema });

  return { db, sqlite };
}

export type DB = BetterSQLite3Database<typeof schema>;
