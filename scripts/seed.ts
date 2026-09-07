import { randomUUID } from "node:crypto";
import { getDb, dbMode } from "../src/lib/db";
import { hashPassword, rolesToJson } from "../src/lib/auth";
import { FIRMA_ID, FIRMA_NAME } from "../src/lib/constants";

async function main() {
  console.log("DB mode:", dbMode());
  const db = await getDb();
  const now = new Date().toISOString();

  const firm = await db.get("SELECT id FROM firms WHERE id = ?", [FIRMA_ID]);
  if (!firm) {
    await db.run(
      "INSERT INTO firms (id, name, global_prisjustering_procent, created_at) VALUES (?, ?, ?, ?)",
      [FIRMA_ID, FIRMA_NAME, 0, now],
    );
    console.log("Created firm", FIRMA_ID);
  } else {
    console.log("Firm exists", FIRMA_ID);
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
      console.log("Updated user", u.email, u.roles.join("+"));
    } else {
      await db.run(
        "INSERT INTO users (id, firma_id, email, password_hash, name, roles) VALUES (?, ?, ?, ?, ?, ?)",
        [randomUUID(), FIRMA_ID, u.email, hash, u.name, rolesToJson(u.roles)],
      );
      console.log("Created user", u.email, u.roles.join("+"));
    }
  }

  console.log("Seed complete.");
  console.log("Test users:");
  console.log("  mester@hojfynsspartel.dk / mester123 (mester)");
  console.log("  admin@hojfynsspartel.dk / admin123 (admin)");
  console.log("  peter@hojfynsspartel.dk / peter123 (mester+admin)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
