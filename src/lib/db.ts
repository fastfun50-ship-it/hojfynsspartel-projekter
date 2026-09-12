import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { put, get } from "@vercel/blob";
import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
type SqlJsStatic = Awaited<ReturnType<typeof initSqlJs>>;
import { ensureSeedIfEmpty, readCount } from "./seedDemo";
import {
  resolveDatabaseUrl,
  resolveAuthToken,
  isLibsqlUrl,
  hasBlobToken,
} from "./env";

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
    aligned_path TEXT,
    width INTEGER,
    height INTEGER,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)`,
  `CREATE INDEX IF NOT EXISTS idx_projects_firma ON projects(firma_id)`,
  `CREATE INDEX IF NOT EXISTS idx_images_project ON images(project_id)`,
  `CREATE TABLE IF NOT EXISTS time_sessions (
    id TEXT PRIMARY KEY,
    sag_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_time_sessions_user ON time_sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_time_sessions_sag ON time_sessions(sag_id)`,
  `CREATE INDEX IF NOT EXISTS idx_time_sessions_running ON time_sessions(user_id, ended_at)`,
  `CREATE TABLE IF NOT EXISTS field_sag_state (
    sag_id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'open',
    closed_at TEXT,
    closed_by TEXT,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    length_m REAL,
    width_m REAL,
    height_m REAL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_rooms_project ON rooms(project_id)`,
];

const SQLJS_WASM_CDN = "https://sql.js.org/dist/sql-wasm.wasm";
/** Single shared sql.js DB object in Vercel Blob (when Turso is absent). */
const BLOB_DB_KEY = "hfs-app-db.bin";

function isVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

function dataDir() {
  return path.join(process.cwd(), "data");
}

function localDbPath() {
  if (isVercel()) {
    return path.join("/tmp", "hfs-app.db");
  }
  return path.join(dataDir(), "app.db");
}

function usesTurso() {
  return isLibsqlUrl(resolveDatabaseUrl());
}

function usesBlobDb(): boolean {
  return !usesTurso() && hasBlobToken();
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
  /** Promise chain serializes mutating run()+persist (avoids corrupt concurrent exports). */
  private writeChain: Promise<void> = Promise.resolve();

  constructor(
    private database: SqlJsDatabase,
    private persistAsync: () => Promise<void>,
  ) {}

  private enqueueWrite(fn: () => Promise<void>): Promise<void> {
    const next = this.writeChain.then(fn, fn);
    // Keep chain alive even if one write fails
    this.writeChain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

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
    await this.enqueueWrite(async () => {
      this.database.run(sql, params as never);
      await this.persistAsync();
    });
  }
}

async function applySchema(db: Db) {
  for (const sql of SCHEMA_STATEMENTS) {
    await db.run(sql);
  }
  // Soft migrations (ignore if column already exists)
  const soft = [
    "ALTER TABLE images ADD COLUMN aligned_path TEXT",
    "ALTER TABLE images ADD COLUMN room_id TEXT",
    "ALTER TABLE projects ADD COLUMN field_status TEXT",
    "ALTER TABLE projects ADD COLUMN customer_name TEXT",
    "ALTER TABLE projects ADD COLUMN phone TEXT",
    "ALTER TABLE projects ADD COLUMN city TEXT",
  ];
  for (const sql of soft) {
    try {
      await db.run(sql);
    } catch {
      /* already present */
    }
  }
}

function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

async function loadDbFromBlob(): Promise<Uint8Array | null> {
  try {
    const result = await get(BLOB_DB_KEY, {
      access: "private",
      useCache: false,
    });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return null;
    }
    const ab = await new Response(result.stream).arrayBuffer();
    return new Uint8Array(ab);
  } catch (err) {
    console.warn("[db] blob load failed (missing or error)", err);
    return null;
  }
}

async function saveDbToBlob(data: Uint8Array): Promise<void> {
  await put(BLOB_DB_KEY, Buffer.from(data), {
    access: "private",
    contentType: "application/octet-stream",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

/** Init sql.js: local wasm → CDN fetch wasmBinary → asm.js (no wasm). */
async function initSqlJsSafe(): Promise<SqlJsStatic> {
  // 1) Local wasm file as wasmBinary (avoid locateFile fs quirks)
  try {
    const candidates = [
      path.join(process.cwd(), "public", "sql-wasm.wasm"),
      path.join(process.cwd(), "node_modules", "sql.js", "dist", "sql-wasm.wasm"),
    ];
    for (const wasmPath of candidates) {
      if (fs.existsSync(wasmPath)) {
        const buf = fs.readFileSync(wasmPath);
        return await initSqlJs({ wasmBinary: bufferToArrayBuffer(buf) });
      }
    }
  } catch (err) {
    console.warn("[db] local wasmBinary load failed, trying CDN", err);
  }

  // 2) Fetch wasm from CDN and pass as wasmBinary
  try {
    const res = await fetch(SQLJS_WASM_CDN);
    if (!res.ok) throw new Error(`CDN wasm HTTP ${res.status}`);
    const wasmBinary = await res.arrayBuffer();
    return await initSqlJs({ wasmBinary });
  } catch (err) {
    console.warn("[db] CDN wasmBinary failed, trying sql-asm.js", err);
  }

  // 3) asm.js — pure JS, no wasm file at all (most reliable on serverless)
  try {
    const asmMod = await import("sql.js/dist/sql-asm.js");
    const initAsm = (asmMod.default ?? asmMod) as typeof initSqlJs;
    return await initAsm();
  } catch (err) {
    console.error("[db] sql-asm.js init failed", err);
    throw err;
  }
}

async function createSqlJs(): Promise<Db> {
  let SQL: SqlJsStatic;
  try {
    SQL = await initSqlJsSafe();
  } catch (err) {
    console.error("[db] sql.js init failed entirely", err);
    throw err;
  }

  const blobMode = usesBlobDb();
  // Local: file under data/app.db. Vercel+Blob: load/save via Blob. Else: ephemeral memory.
  let persistPath: string | null = null;
  let database: SqlJsDatabase;

  if (blobMode) {
    const existing = await loadDbFromBlob();
    database = existing
      ? new SQL.Database(existing)
      : new SQL.Database();
  } else if (isVercel()) {
    // No Turso, no Blob → ephemeral per isolate (create→detail will 404 across isolates)
    database = new SQL.Database();
  } else {
    try {
      fs.mkdirSync(dataDir(), { recursive: true });
      persistPath = localDbPath();
      if (fs.existsSync(persistPath)) {
        database = new SQL.Database(fs.readFileSync(persistPath));
      } else {
        database = new SQL.Database();
      }
    } catch (err) {
      console.warn("[db] cannot use file DB, falling back to in-memory only", err);
      database = new SQL.Database();
      persistPath = null;
    }
  }

  const persistAsync = async () => {
    if (blobMode) {
      try {
        await saveDbToBlob(database.export());
      } catch (err) {
        console.warn("[db] blob persist failed", err);
        throw err;
      }
      return;
    }
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

  const db = new SqlJsDb(database, persistAsync);
  await applySchema(db);
  await ensureSeedIfEmpty(db);
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
  try {
    return await globalThis.__hfsDbPromise;
  } catch (err) {
    // Allow retry after a failed init (e.g. transient CDN / Blob)
    globalThis.__hfsDbPromise = undefined;
    throw err;
  }
}

export function dbMode(): "turso" | "sqljs-blob" | "sqljs" {
  if (usesTurso()) return "turso";
  if (usesBlobDb()) return "sqljs-blob";
  return "sqljs";
}

/** True when Vercel has neither Turso nor Blob — data is isolate-ephemeral. */
export function isEphemeralDb(): boolean {
  return isVercel() && !usesTurso() && !hasBlobToken();
}

/** For /api/health — count users with robust column key handling. */
export async function countUsers(db: Db): Promise<number> {
  const row = await db.get<Record<string, unknown>>("SELECT COUNT(*) as c FROM users");
  return readCount(row);
}
