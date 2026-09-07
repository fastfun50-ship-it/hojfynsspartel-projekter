import { randomUUID } from "node:crypto";
import type { Db } from "./db";
import { hashPassword, rolesToJson } from "./auth";
import { FIRMA_ID, FIRMA_NAME } from "./constants";

/** Minimal demo seed — safe to call when users table is empty (e.g. Vercel /tmp sql.js). */
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
  const row = await db.get<{ c: number }>("SELECT COUNT(*) as c FROM users");
  const count = Number(row?.c ?? 0);
  if (count === 0) {
    await seedDemoUsers(db);
  }
}
