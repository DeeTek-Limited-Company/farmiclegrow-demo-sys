import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/guards";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ message: "Supabase Storage is not configured." }, { status: 500 });
  }

  const url = new URL(request.url);
  const bucket = String(url.searchParams.get("bucket") || "");
  const key = String(url.searchParams.get("key") || "");

  if (!bucket || !key) {
    return NextResponse.json({ message: "Missing bucket or key" }, { status: 400 });
  }

  if (bucket.includes("..") || key.includes("..")) {
    return NextResponse.json({ message: "Invalid bucket or key" }, { status: 400 });
  }

  const objectUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${bucket}/${key}`;
  const res = await fetch(objectUrl, {
    headers: {
      authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ message: text || "Failed to fetch object" }, { status: 502 });
  }

  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const cacheControl = res.headers.get("cache-control") || "private, max-age=60";

  return new NextResponse(res.body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": cacheControl,
    },
  });
}

