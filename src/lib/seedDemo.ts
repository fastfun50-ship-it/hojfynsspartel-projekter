import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Db } from "./db";
import { FIRMA_ID, FIRMA_NAME } from "./constants";

function rolesToJson(roles: string[]): string {
  return JSON.stringify(roles);
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/** Robust COUNT: some drivers return key "COUNT(*)" instead of alias "c". */
export function readCount(row: Record<string, unknown> | undefined | null): number {
  if (!row) return 0;
  if (row.c != null && row.c !== "") {
    const n = Number(row.c);
    if (!Number.isNaN(n)) return n;
  }
  if (row["COUNT(*)"] != null) {
    const n = Number(row["COUNT(*)"]);
    if (!Number.isNaN(n)) return n;
  }
  for (const v of Object.values(row)) {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

/** Minimal demo seed — safe when users table is empty (e.g. Vercel in-memory sql.js). */
export async function seedDemoUsers(db: Db): Promise<void> {
  const now = new Date().toISOString();

  const firm = await db.get("SELECT id FROM firms WHERE id = ?", [FIRMA_ID]);
  if (!firm) {
    await db.run(
      "INSERT INTO firms (id, name, global_prisjustering_procent, created_at) VALUES (?, ?, ?, ?)",
      [FIRMA_ID, FIRMA_NAME, 0, now],
    );
  }

  const users = [
    {
      email: "mester@hojfynsspartel.dk",
      password: "mester123",
      name: "Mester",
      roles: ["mester"],
    },
    {
      email: "admin@hojfynsspartel.dk",
      password: "admin123",
      name: "Admin",
      roles: ["admin"],
    },
    {
      email: "peter@hojfynsspartel.dk",
      password: "peter123",
      name: "Peter",
      roles: ["mester", "admin"],
    },
  ];

  for (const u of users) {
    const existing = await db.get("SELECT id FROM users WHERE email = ?", [u.email]);
    const hash = await hashPassword(u.password);
    if (existing) {
      await db.run(
        "UPDATE users SET password_hash = ?, name = ?, roles = ?, firma_id = ? WHERE email = ?",
        [hash, u.name, rolesToJson(u.roles), FIRMA_ID, u.email],
      );
    } else {
      await db.run(
        "INSERT INTO users (id, firma_id, email, password_hash, name, roles) VALUES (?, ?, ?, ?, ?, ?)",
        [randomUUID(), FIRMA_ID, u.email, hash, u.name, rolesToJson(u.roles)],
      );
    }
  }
}

export async function ensureSeedIfEmpty(db: Db): Promise<void> {
  const row = await db.get<Record<string, unknown>>("SELECT COUNT(*) as c FROM users");
  const count = readCount(row);
  if (count === 0) {
    await seedDemoUsers(db);
  }
}
