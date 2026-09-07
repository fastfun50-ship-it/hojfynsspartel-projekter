import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";

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

function dataDir() {
  return path.join(process.cwd(), "data");
}

function localDbPath() {
  return path.join(dataDir(), "app.db");
}

function usesTurso() {
  const url = process.env.TURSO_DATABASE_URL || "";
  return url.startsWith("libsql://") || url.startsWith("https://");
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

async function createSqlJs(): Promise<Db> {
  const wasmPath = path.join(process.cwd(), "node_modules", "sql.js", "dist", "sql-wasm.wasm");
  const wasmBinary = fs.readFileSync(wasmPath).buffer;
  const SQL = await initSqlJs({ wasmBinary: wasmBinary as ArrayBuffer });
  fs.mkdirSync(dataDir(), { recursive: true });
  const file = localDbPath();
  let database: SqlJsDatabase;
  if (fs.existsSync(file)) {
    database = new SQL.Database(fs.readFileSync(file));
  } else {
    database = new SQL.Database();
  }
  const persist = () => {
    const tmp = file + ".tmp";
    fs.writeFileSync(tmp, Buffer.from(database.export()));
    fs.renameSync(tmp, file);
  };
  const db = new SqlJsDb(database, persist);
  await applySchema(db);
  persist();
  return db;
}

async function createTurso(): Promise<Db> {
  const url = process.env.TURSO_DATABASE_URL as string;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const client = createClient({ url, authToken });
  const db = new LibsqlDb(client);
  await applySchema(db);
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
