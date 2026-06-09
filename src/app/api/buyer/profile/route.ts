import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { requireOrgScope } from "@/lib/tenant/scope";

const profileSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  phoneNumber: z.string().min(5, "Phone number is required"),
  businessAddress: z.string().min(5, "Business address is required"),
  country: z.string().min(2, "Country is required"),
  taxId: z.string().optional(),
  businessType: z.string().optional(),
});

export async function GET() {
  const auth = await requireApiRole(["buyer"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const profile = await prisma.buyerProfile.findUnique({
    where: { userId: auth.user.id },
  });

  return NextResponse.json(profile);
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["buyer"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const actor = auth.user;
  const organizationId = requireOrgScope(actor);

  try {
    const body = await request.json();
    const validated = profileSchema.parse(body);

    const profile = await prisma.buyerProfile.upsert({
      where: { userId: auth.user.id },
      update: validated,
      create: {
        ...validated,
        organizationId,
        userId: actor.id,
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid data", errors: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
