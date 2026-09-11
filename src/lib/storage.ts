import fs from "node:fs/promises";
import path from "node:path";
import { put, del } from "@vercel/blob";
import sharp from "sharp";
import { MAX_IMAGE_EDGE } from "./constants";

export type StoredImage = {
  path: string;
  width: number;
  height: number;
};

function uploadsRoot() {
  return path.join(process.cwd(), "data", "uploads");
}

function blobEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function processAndStoreImage(
  projectId: string,
  imageId: string,
  input: Buffer,
): Promise<StoredImage> {
  const resized = await sharp(input)
    .rotate()
    .resize({
      width: MAX_IMAGE_EDGE,
      height: MAX_IMAGE_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  const { data, info } = resized;
  const relative = projectId + "/" + imageId + ".jpg";

  if (blobEnabled()) {
    const blob = await put("uploads/" + relative, data, {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: false,
    });
    return { path: blob.url, width: info.width, height: info.height };
  }

  const dir = path.join(uploadsRoot(), projectId);
  await fs.mkdir(dir, { recursive: true });
  const abs = path.join(uploadsRoot(), relative);
  await fs.writeFile(abs, data);
  return { path: relative, width: info.width, height: info.height };
}

export async function deleteStoredImage(storedPath: string): Promise<void> {
  if (storedPath.startsWith("http://") || storedPath.startsWith("https://")) {
    if (blobEnabled()) {
      try {
        await del(storedPath);
      } catch {
        // ignore missing blob
      }
    }
    return;
  }
  const abs = path.join(uploadsRoot(), storedPath);
  try {
    await fs.unlink(abs);
  } catch {
    // ignore
  }
}

export function publicImageUrl(storedPath: string): string {
  if (storedPath.startsWith("http://") || storedPath.startsWith("https://")) {
    return storedPath;
  }
  return "/api/uploads/" + storedPath.split(path.sep).join("/");
}
