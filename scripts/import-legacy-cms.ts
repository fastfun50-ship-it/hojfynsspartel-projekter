import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { getDb, dbMode } from "../src/lib/db";
import { seedDemoUsers } from "../src/lib/seedDemo";
import { FIRMA_ID } from "../src/lib/constants";
import { processAndStoreImage } from "../src/lib/storage";
import type { Category, ImageType, Project, UserRow } from "../src/lib/types";

/**
 * One-shot import of legacy CMS / marketing-site projects.
 * Sources: højfynsspartel.dk (live) + hojfynsspartel-main SelectedWork data.
 * Idempotent: skips existing slug (in note) or title.
 *
 *   npx tsx scripts/import-legacy-cms.ts
 *   npm run import:cms
 */

const LIVE_ORIGIN = "https://xn--hjfynsspartel-bnb.dk";
const MARKETING_PUBLIC = path.resolve(process.cwd(), "..", "public");

type LegacyImage = {
  type: ImageType;
  file?: string;
  url?: string;
};

type LegacyProject = {
  slug: string;
  title: string;
  category: Category;
  year: number | null;
  location: string;
  challenge: string;
  approach: string;
  result: string;
  images: LegacyImage[];
};

const LEGACY: LegacyProject[] = [
  {
    slug: "foer-og-efter-privat-bolig",
    title: "Før og efter – privat bolig",
    category: "vaeg",
    year: 2024,
    location: "Fyn",
    challenge:
      "De eksisterende vægge var ujævne med gamle lag spartelmasse og tapet. Kunden ville have helt glatte overflader uden at skulle starte forfra.",
    approach:
      "Vi gennemgik væggene grundigt, fjernede det nødvendige og byggede nye, plane overflader op med flere lag og mellemslibninger.",
    result:
      "Væggene blev helt glatte og ensartede. Kunden kunne efterfølgende male selv uden at skulle bruge tid på yderligere forberedelse.",
    images: [
      {
        type: "foer",
        file: "images/projects/before-after/before-01.jpg",
        url: LIVE_ORIGIN + "/images/projects/before-after/before-01.jpg",
      },
      {
        type: "efter",
        file: "images/projects/before-after/after-01.jpg",
        url: LIVE_ORIGIN + "/images/projects/before-after/after-01.jpg",
      },
    ],
  },
  {
    slug: "nyt-projekt",
    title: "Nyt projekt",
    category: "vaeg",
    year: 2025,
    location: "Fyn",
    challenge: "Ny gips skal spartles og males.",
    approach:
      "Hjørneskinner på alle 90-graders hjørner, flexskinner på øvrige, armeringsstrimler i alle samlinger, grovspartling, fuldspartling, slib, grunding, to gange maling og fugning af træværk.",
    result: "Færdigmalede vægge og træværk.",
    images: [
      {
        type: "efter",
        url: "https://xuftxi2fcqqy3g3i.public.blob.vercel-storage.com/uploads/1786645706836-img_3563.jpeg",
      },
    ],
  },
  {
    slug: "stort-erhvervsbyggeri",
    title: "Stort erhvervsbyggeri",
    category: "andet",
    year: 2024,
    location: "Fyn",
    challenge:
      "Der skulle spartles store flader i en aktiv byggeplads med stramme tidsplaner og høje krav til ensartethed.",
    approach:
      "Vi lagde en klar plan for etaper, daglig oprydning og tæt dialog med de andre håndværkere på pladsen for at undgå forsinkelser.",
    result:
      "Fladerne blev leveret til tiden og med en ensartet finish, som maleren kunne arbejde videre med uden ekstra forberedelse.",
    images: [
      {
        type: "foer",
        file: "images/projects/commercial/commercial-hall-plastering-01.jpg",
        url: LIVE_ORIGIN + "/images/projects/commercial/commercial-hall-plastering-01.jpg",
      },
      {
        type: "under",
        file: "images/projects/commercial/commercial-hall-plastering-02.jpg",
        url: LIVE_ORIGIN + "/images/projects/commercial/commercial-hall-plastering-02.jpg",
      },
      {
        type: "efter",
        file: "images/projects/commercial/commercial-hall-plastering-03.jpg",
        url: LIVE_ORIGIN + "/images/projects/commercial/commercial-hall-plastering-03.jpg",
      },
    ],
  },
];

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function legacyTag(slug: string): string {
  return "[legacy:" + slug + "]";
}

function buildNote(p: LegacyProject): string {
  return [
    legacyTag(p.slug),
    p.location,
    "",
    "Udfordringen: " + p.challenge,
    "Sådan greb vi det an: " + p.approach,
    "Resultatet: " + p.result,
  ].join("\n");
}

function buildScope(p: LegacyProject): string {
  return [p.challenge, p.approach, p.result].join("\n\n");
}

async function loadImageBuffer(img: LegacyImage): Promise<Buffer> {
  if (img.file) {
    const abs = path.join(MARKETING_PUBLIC, img.file);
    if (existsSync(abs)) {
      return readFileSync(abs);
    }
  }
  if (img.url) {
    const res = await fetch(img.url);
    if (!res.ok) {
      throw new Error("HTTP " + res.status + " " + img.url);
    }
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("Ingen fil eller url");
}

async function findCreator(db: Awaited<ReturnType<typeof getDb>>): Promise<string> {
  const preferred = await db.get<UserRow>(
    "SELECT * FROM users WHERE email = ? AND firma_id = ?",
    ["peter@hojfynsspartel.dk", FIRMA_ID],
  );
  if (preferred) return preferred.id;
  const any = await db.get<UserRow>("SELECT * FROM users WHERE firma_id = ?", [FIRMA_ID]);
  if (!any) throw new Error("Ingen bruger at knytte import til — kør seed først");
  return any.id;
}

async function alreadyImported(
  db: Awaited<ReturnType<typeof getDb>>,
  p: LegacyProject,
): Promise<boolean> {
  const byNote = await db.get<Project>(
    "SELECT * FROM projects WHERE firma_id = ? AND note LIKE ?",
    [FIRMA_ID, "%" + legacyTag(p.slug) + "%"],
  );
  if (byNote) return true;
  const rows = await db.all<Project>("SELECT * FROM projects WHERE firma_id = ?", [FIRMA_ID]);
  const wantTitle = p.title.trim().toLowerCase();
  const wantSlug = p.slug;
  return rows.some((row) => {
    const title = (row.title || "").trim().toLowerCase();
    if (title === wantTitle) return true;
    return slugify(row.title || "") === wantSlug;
  });
}

async function main() {
  console.log("DB mode:", dbMode());
  const db = await getDb();
  await seedDemoUsers(db);
  const createdBy = await findCreator(db);

  let imported = 0;
  let skipped = 0;

  for (const item of LEGACY) {
    if (await alreadyImported(db, item)) {
      console.log("Skip (findes):", item.title);
      skipped += 1;
      continue;
    }

    const loaded: { type: ImageType; buf: Buffer }[] = [];
    for (const img of item.images) {
      try {
        loaded.push({ type: img.type, buf: await loadImageBuffer(img) });
      } catch (err) {
        console.warn("  Billede sprunget over:", img.file || img.url, String(err));
      }
    }
    if (loaded.length === 0) {
      console.warn("Skip (ingen billeder):", item.title);
      skipped += 1;
      continue;
    }

    const now = new Date().toISOString();
    const id = randomUUID();
    await db.run(
      `INSERT INTO projects (
        id, firma_id, title, category, note, status,
        price_from, price_to, scope, year,
        may_show_public, show_price_on_site, reject_note,
        created_by, created_at, updated_at, published_at
      ) VALUES (?, ?, ?, ?, ?, 'publiceret', NULL, NULL, ?, ?, 1, 0, NULL, ?, ?, ?, ?)`,
      [
        id,
        FIRMA_ID,
        item.title,
        item.category,
        buildNote(item),
        buildScope(item),
        item.year,
        createdBy,
        now,
        now,
        now,
      ],
    );

    for (const img of loaded) {
      const imageId = randomUUID();
      const stored = await processAndStoreImage(id, imageId, img.buf);
      await db.run(
        "INSERT INTO images (id, project_id, type, path, width, height, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [imageId, id, img.type, stored.path, stored.width, stored.height, createdBy, now],
      );
    }

    console.log("Importeret:", item.title, "(" + loaded.length + " billeder)");
    imported += 1;
  }

  console.log("Færdig. importeret=" + imported + " sprunget=" + skipped);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
