import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/guards";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { buildLocalUploadPath, isSupabaseStorageConfigured, type UploadKind } from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const defaultBucket = process.env.SUPABASE_STORAGE_BUCKET || "uploads";

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ message: "Invalid form data" }, { status: 400 });
  }

  const kind = String(form.get("kind") || "").trim().toLowerCase() as UploadKind;

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Missing file" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
  if (!file.type || !allowedTypes.includes(file.type)) {
    return NextResponse.json({ message: "Only JPG/PNG/PDF files are allowed" }, { status: 400 });
  }

  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ message: "File too large (max 10MB)" }, { status: 413 });
  }

  const ext =
    file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
  const datePrefix = new Date().toISOString().slice(0, 10);
  const fileName = randomBytes(8).toString("hex");
  const key = `${datePrefix}/${fileName}.${ext}`;

  const bucket =
    kind === "docs"
      ? process.env.SUPABASE_BUCKET_DOCS || defaultBucket
      : kind === "photos"
        ? process.env.SUPABASE_BUCKET_PHOTOS || defaultBucket
        : kind === "certs"
          ? process.env.SUPABASE_BUCKET_CERTS || defaultBucket
          : defaultBucket;

  if (!isSupabaseStorageConfigured(process.env)) {
    const localKind: UploadKind = kind === "docs" || kind === "photos" || kind === "certs" ? kind : "docs";
    const publicPath = buildLocalUploadPath({
      kind: localKind,
      datePrefix,
      fileName,
      extension: ext,
    });
    const targetPath = path.join(process.cwd(), "public", ...publicPath.replace(/^\//, "").split("/"));
    const targetDir = path.dirname(targetPath);
    await mkdir(targetDir, { recursive: true });
    await writeFile(targetPath, Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({
      url: publicPath,
      publicUrl: publicPath,
      storage: "local",
      key: publicPath.replace(/^\/+/, ""),
    });
  }

  const configuredSupabaseUrl = supabaseUrl!;
  const configuredServiceKey = serviceKey!;

  const arrayBuffer = await file.arrayBuffer();
  const uploadUrl = `${configuredSupabaseUrl.replace(/\/$/, "")}/storage/v1/object/${bucket}/${key}`;
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${configuredServiceKey}`,
      apikey: configuredServiceKey,
      "content-type": file.type,
      "x-upsert": "true",
    },
    body: Buffer.from(arrayBuffer),
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => "");
    return NextResponse.json({ message: text || "Upload failed" }, { status: 502 });
  }

  const publicUrl = `${configuredSupabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${encodeURI(key)}`;
  const proxyUrl = `/api/uploads/object?bucket=${encodeURIComponent(bucket)}&key=${encodeURIComponent(key)}`;
  return NextResponse.json({ url: proxyUrl, publicUrl, bucket, key });
}
