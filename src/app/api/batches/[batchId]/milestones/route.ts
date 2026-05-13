import { requireApiRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
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
    const user = await requireApiRole(["admin", "agronomist", "ops"]);
    const { batchId } = await params;

    const body = await request.json();
    const validatedData = milestoneSchema.parse(body);

    const batch = await prisma.batch.findUnique({
      where: { batchId },
      select: { id: true },
    });

    if (!batch) {
      return NextResponse.json({ message: "Batch not found" }, { status: 404 });
    }

    const milestone = await prisma.batchMilestone.create({
      data: {
        batchId: batch.id,
        type: validatedData.type,
        status: validatedData.status,
        location: validatedData.location,
        notes: validatedData.notes,
        performedBy: user.fullName,
        timestamp: new Date(),
      },
    });

    return NextResponse.json({ milestone }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating milestone:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid data", errors: error.errors },
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
    const { batchId } = await params;

    const batch = await prisma.batch.findUnique({
      where: { batchId },
      select: { id: true },
    });

    if (!batch) {
      return NextResponse.json({ message: "Batch not found" }, { status: 404 });
    }

    const milestones = await prisma.batchMilestone.findMany({
      where: { batchId: batch.id },
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
