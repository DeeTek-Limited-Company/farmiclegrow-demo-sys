import { requireApiRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { requireOrgScope } from "@/lib/tenant/scope";
import { NextResponse } from "next/server";
import { z } from "zod";

const milestoneSchema = z.object({
  type: z.enum([
    "CLEANING",
    "GRADING",
    "PACKAGING",
    "PORT_ARRIVAL",
    "PORT_DEPARTURE",
    "IN_TRANSIT",
    "DELIVERED",
  ]),
  location: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).default("COMPLETED"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const auth = await requireApiRole(["admin", "agronomist", "ops"]);
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }
    const user = auth.user;
    const organizationId = requireOrgScope(user);
    const { batchId } = await params;

    const body = await request.json();
    const validatedData = milestoneSchema.parse(body);

    const batch = await prisma.batch.findFirst({
      where: { batchId, organizationId },
      select: { id: true, organizationId: true },
    });

    if (!batch) {
      return NextResponse.json({ message: "Batch not found" }, { status: 404 });
    }

    const milestone = await prisma.batchMilestone.create({
      data: {
        organizationId: batch.organizationId,
        batchId: batch.id,
        type: validatedData.type,
        status: validatedData.status,
        location: validatedData.location,
        notes: validatedData.notes,
        performedBy: user.name,
        timestamp: new Date(),
      },
    });

    return NextResponse.json({ milestone }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating milestone:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid data", errors: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const auth = await requireApiRole(["admin", "agronomist", "ops", "farmer"]);
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }
    const user = auth.user;
    const organizationId = requireOrgScope(user);
    const { batchId } = await params;
    if (user.roles.includes("farmer")) {
      return NextResponse.json(
        { message: "Farmer self-service is not supported in this release." },
        { status: 403 },
      );
    }

    const batch = await prisma.batch.findFirst({
      where: { batchId, organizationId },
      select: { id: true, organizationId: true, farmerId: true },
    });

    if (!batch) {
      return NextResponse.json({ message: "Batch not found" }, { status: 404 });
    }

    const milestones = await prisma.batchMilestone.findMany({
      where: { batchId: batch.id, organizationId: batch.organizationId },
      orderBy: { timestamp: "asc" },
    });

    return NextResponse.json({ milestones });
  } catch (error: any) {
    console.error("Error fetching milestones:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
