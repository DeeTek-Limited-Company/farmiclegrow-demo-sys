import { NextResponse } from "next/server";
import { publicNotFound, publicOptions, withPublicCors } from "@/lib/public/http";
import { GET as getByCode } from "@/app/api/public/trace/[code]/route";

export async function OPTIONS(request: Request) {
  return publicOptions(request);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; code: string }> },
) {
  const { slug, code } = await params;
  const res = await getByCode(request, { params: Promise.resolve({ code }) });
  if (!res.ok) return res;
  const body = await res.json().catch(() => null);
  if (!body?.trace?.organization?.slug) return publicNotFound(request);
  if (body.trace.organization.slug !== slug) return publicNotFound(request);
  return withPublicCors(request, NextResponse.json(body));
}
