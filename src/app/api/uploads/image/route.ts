import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireApiRole } from "@/lib/auth/guards";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ message: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Missing file" }, { status: 400 });
  }

  if (!file.type || !["image/jpeg", "image/png"].includes(file.type)) {
    return NextResponse.json({ message: "Only JPG/PNG images are allowed" }, { status: 400 });
  }

  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ message: "File too large (max 10MB)" }, { status: 413 });
  }

  const ext = file.type === "image/png" ? "png" : "jpg";
  const key = `uploads/${new Date().toISOString().slice(0, 10)}/${randomBytes(8).toString("hex")}.${ext}`;

  const result = await put(key, file, { access: "public" });

  return NextResponse.json({ url: result.url });
}

