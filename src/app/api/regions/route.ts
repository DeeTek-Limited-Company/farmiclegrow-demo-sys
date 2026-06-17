import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";

const createSchema = z.object({
  name: z.string().min(2, "Region name is required"),
});

export async function GET() {
  const auth = await requireApiRole(["admin", "ops", "agronomist"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const regions = await prisma.region.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ regions });
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const payload = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const region = await prisma.region.create({
    data: { name: parsed.data.name.trim() },
  });

  return NextResponse.json({ region }, { status: 201 });
}
