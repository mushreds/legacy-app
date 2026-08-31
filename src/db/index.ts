import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";
import { seedIfEmpty } from "./seed-data";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "vendas.db");
const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

declare global {
  // eslint-disable-next-line no-var
  var __vendasDb: ReturnType<typeof createDb> | undefined;
}

function createDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  seedIfEmpty(db);
  return db;
}

// Singleton por processo (o dev server do Next recarrega módulos com frequência).
export const db = globalThis.__vendasDb ?? createDb();
globalThis.__vendasDb = db;

export * as tables from "./schema";
