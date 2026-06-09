import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { logAudit } from "@/lib/security/audit";

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase and hyphen-separated (e.g. acme-farms)");

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  subscriptionPlan: z.string().optional(),
});

export async function GET() {
  const auth = await requireApiRole(["super_admin"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      publicTraceEnabled: true,
      createdAt: true,
      _count: {
        select: {
          users: true,
          farmers: true,
          batches: true,
        },
      },
    },
  });

  return NextResponse.json({ organizations });
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["super_admin"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const payload = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, slug, email, phone, country, subscriptionPlan } = parsed.data;

  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ message: "Organization slug already exists." }, { status: 409 });
  }

  const organization = await prisma.organization.create({
    data: {
      name,
      slug,
      email: email || undefined,
      phone: phone || undefined,
      country: country || undefined,
      subscriptionPlan: subscriptionPlan || "STARTER",
      status: "ACTIVE",
      publicTraceEnabled: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      publicTraceEnabled: true,
      createdAt: true,
    },
  });

  await logAudit({
    action: "ORGANIZATION_CREATED",
    organizationId: organization.id,
    userId: auth.user.id,
    details: { name, slug, plan: subscriptionPlan },
    status: "SUCCESS",
  });

  return NextResponse.json({ organization }, { status: 201 });
}

