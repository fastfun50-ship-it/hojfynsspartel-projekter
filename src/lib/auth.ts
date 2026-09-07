import bcrypt from "bcryptjs";
import { getDb } from "./db";
import type { SessionUser, UserRow } from "./types";
import { FIRMA_ID } from "./constants";

export function parseRoles(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [String(raw)];
  } catch {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
}

export function rolesToJson(roles: string[]): string {
  return JSON.stringify(roles);
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  const db = await getDb();
  return db.get<UserRow>("SELECT * FROM users WHERE email = ? AND firma_id = ?", [
    email.toLowerCase(),
    FIRMA_ID,
  ]);
}

export async function verifyLogin(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const row = await findUserByEmail(email);
  if (!row) return null;
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return null;
  return {
    id: row.id,
    firma_id: row.firma_id,
    email: row.email,
    name: row.name,
    roles: parseRoles(row.roles),
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
