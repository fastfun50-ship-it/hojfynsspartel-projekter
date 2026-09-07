import { getDb, dbMode } from "../src/lib/db";
import { seedDemoUsers } from "../src/lib/seedDemo";

async function main() {
  console.log("DB mode:", dbMode());
  const db = await getDb();
  await seedDemoUsers(db);
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
