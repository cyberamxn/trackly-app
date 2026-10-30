import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

// GET /api/uploads/[file] — public download endpoint for files uploaded via
// /api/admin/upload (used by the /demo landing page download buttons).
// Serves the file as an attachment with its original filename.

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const META_FILE = path.join(UPLOAD_DIR, "meta.json");

const MIME_BY_EXT: Record<string, string> = {
  ".apk": "application/vnd.android.package-archive",
  ".ipa": "application/octet-stream",
  ".dmg": "application/x-apple-diskimage",
  ".zip": "application/zip",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".txt": "text/plain",
  ".json": "application/json",
};

function asciiFallback(name: string): string {
  const cleaned = name.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return cleaned || "download";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;

  // Path-traversal / format guard: stored names are [A-Za-z0-9._-], no ".."
  if (!file || file.includes("..") || !/^[A-Za-z0-9._-]+$/.test(file)) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
  }

  const filePath = path.join(UPLOAD_DIR, file);
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not a file");

    let meta: Record<string, any> = {};
    try {
      meta = JSON.parse(await readFile(META_FILE, "utf-8"));
    } catch {}
    const entry = meta[file] ?? {};

    const contentType =
      entry.contentType && entry.contentType !== "application/octet-stream"
        ? entry.contentType
        : MIME_BY_EXT[path.extname(file).toLowerCase()] ?? "application/octet-stream";
    const originalName: string = entry.originalName || file;

    const buffer = await readFile(filePath);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        "Content-Disposition": `attachment; filename="${asciiFallback(originalName)}"; filename*=UTF-8''${encodeURIComponent(originalName)}`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
