import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
type SqlJsStatic = Awaited<ReturnType<typeof initSqlJs>>;
import { ensureSeedIfEmpty } from "./seedDemo";
import { resolveDatabaseUrl, resolveAuthToken, isLibsqlUrl } from "./env";

export type SqlValue = string | number | bigint | boolean | null | Uint8Array;
export type SqlParams = SqlValue[];

export interface Db {
  all<T = Record<string, unknown>>(sql: string, params?: SqlParams): Promise<T[]>;
  get<T = Record<string, unknown>>(sql: string, params?: SqlParams): Promise<T | undefined>;
  run(sql: string, params?: SqlParams): Promise<void>;
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS firms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    global_prisjustering_procent REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS price_adjustment_logs (
    id TEXT PRIMARY KEY,
    firma_id TEXT NOT NULL,
    procent REAL NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    firma_id TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    roles TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    firma_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    note TEXT,
    status TEXT NOT NULL,
    price_from INTEGER,
    price_to INTEGER,
    scope TEXT,
    year INTEGER,
    may_show_public INTEGER NOT NULL DEFAULT 0,
    show_price_on_site INTEGER NOT NULL DEFAULT 0,
    reject_note TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    published_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    type TEXT NOT NULL,
    path TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)`,
  `CREATE INDEX IF NOT EXISTS idx_projects_firma ON projects(firma_id)`,
  `CREATE INDEX IF NOT EXISTS idx_images_project ON images(project_id)`,
];

function isVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

function dataDir() {
  return path.join(process.cwd(), "data");
}

function localDbPath() {
  // Vercel serverless FS is read-only except /tmp
  if (isVercel()) {
    return path.join("/tmp", "hfs-app.db");
  }
  return path.join(dataDir(), "app.db");
}

function usesTurso() {
  return isLibsqlUrl(resolveDatabaseUrl());
}

class LibsqlDb implements Db {
  constructor(private client: Client) {}
  async all<T>(sql: string, params: SqlParams = []): Promise<T[]> {
    const rs = await this.client.execute({ sql, args: params as never });
    return rs.rows as unknown as T[];
  }
  async get<T>(sql: string, params: SqlParams = []): Promise<T | undefined> {
    const rows = await this.all<T>(sql, params);
    return rows[0];
  }
  async run(sql: string, params: SqlParams = []): Promise<void> {
    await this.client.execute({ sql, args: params as never });
  }
}

class SqlJsDb implements Db {
  constructor(
    private database: SqlJsDatabase,
    private persist: () => void,
  ) {}
  async all<T>(sql: string, params: SqlParams = []): Promise<T[]> {
    const stmt = this.database.prepare(sql);
    if (params.length) stmt.bind(params as never);
    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return rows;
  }
  async get<T>(sql: string, params: SqlParams = []): Promise<T | undefined> {
    const rows = await this.all<T>(sql, params);
    return rows[0];
  }
  async run(sql: string, params: SqlParams = []): Promise<void> {
    this.database.run(sql, params as never);
    this.persist();
  }
}

async function applySchema(db: Db) {
  for (const sql of SCHEMA_STATEMENTS) {
    await db.run(sql);
  }
}

async function initSqlJsSafe(): Promise<SqlJsStatic> {
  const wasmPath = path.join(process.cwd(), "node_modules", "sql.js", "dist", "sql-wasm.wasm");
  try {
    if (fs.existsSync(wasmPath)) {
      const wasmBinary = fs.readFileSync(wasmPath).buffer;
      return await initSqlJs({ wasmBinary: wasmBinary as ArrayBuffer });
    }
  } catch (err) {
    console.warn("[db] wasmBinary load failed, trying locateFile", err);
  }

  try {
    return await initSqlJs({
      locateFile: (file) =>
        path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
    });
  } catch (err) {
    console.warn("[db] locateFile wasm failed, trying default init", err);
  }

  // Last resort: in-memory asm.js / bundled fallback if available
  return await initSqlJs();
}

async function createSqlJs(): Promise<Db> {
  let SQL: SqlJsStatic;
  try {
    SQL = await initSqlJsSafe();
  } catch (err) {
    console.error("[db] sql.js init failed entirely", err);
    throw err;
  }

  const file = localDbPath();
  let persistPath: string | null = file;
  let database: SqlJsDatabase;

  try {
    if (!isVercel()) {
      fs.mkdirSync(dataDir(), { recursive: true });
    }
    if (fs.existsSync(file)) {
      database = new SQL.Database(fs.readFileSync(file));
    } else {
      database = new SQL.Database();
    }
  } catch (err) {
    console.warn("[db] cannot use file DB, falling back to in-memory only", err);
    database = new SQL.Database();
    persistPath = null;
  }

  const persist = () => {
    if (!persistPath) return;
    try {
      const tmp = persistPath + ".tmp";
      fs.writeFileSync(tmp, Buffer.from(database.export()));
      fs.renameSync(tmp, persistPath);
    } catch (err) {
      console.warn("[db] persist failed (read-only FS?)", err);
      persistPath = null;
    }
  };

  const db = new SqlJsDb(database, persist);
  await applySchema(db);
  persist();
  await ensureSeedIfEmpty(db);
  persist();
  return db;
}

async function createTurso(): Promise<Db> {
  const url = resolveDatabaseUrl();
  const authToken = resolveAuthToken() || undefined;
  const client = createClient({ url, authToken });
  const db = new LibsqlDb(client);
  await applySchema(db);
  await ensureSeedIfEmpty(db);
  return db;
}

declare global {
  var __hfsDbPromise: Promise<Db> | undefined;
}

export async function getDb(): Promise<Db> {
  if (!globalThis.__hfsDbPromise) {
    globalThis.__hfsDbPromise = usesTurso() ? createTurso() : createSqlJs();
  }
  return globalThis.__hfsDbPromise;
}

export function dbMode(): "turso" | "sqljs" {
  return usesTurso() ? "turso" : "sqljs";
}
