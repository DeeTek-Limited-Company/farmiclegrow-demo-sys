import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { recomputeFarmerQualityScore } from "@/lib/quality-score";
import { logAudit } from "@/lib/security/audit";

const decisionSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().trim().max(600).optional(),
});

type RouteContext = {
  params: Promise<{ submissionId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || undefined;

  const payload = await request.json().catch(() => null);
  const parsed = decisionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid decision payload.", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { submissionId } = await context.params;
  const decision = parsed.data;
  const decisionNote = decision.reason?.trim();

  const submission = await prisma.farmerSubmission.findUnique({
    where: { id: submissionId },
    include: {
      farmer: true,
      submittedBy: true,
    },
  });

  if (!submission) {
    return NextResponse.json({ message: "Submission not found." }, { status: 404 });
  }

  if (submission.status !== "PENDING_REVIEW") {
    return NextResponse.json(
      { message: "Only pending submissions can be reviewed." },
      { status: 409 },
    );
  }

  if (decision.action === "REJECTED" && !decisionNote) {
    return NextResponse.json({ message: "Rejection reason is required." }, { status: 400 });
  }

  const approved = decision.action === "APPROVED";

  await prisma.$transaction(async (tx) => {
    await tx.farmerSubmission.update({
      where: { id: submissionId },
      data: {
        status: decision.action,
        rejectionReason: approved ? null : decisionNote ?? null,
        decidedAt: new Date(),
      },
    });

    await tx.approvalAction.create({
      data: {
        submissionId,
        actorUserId: auth.user.id,
        action: decision.action,
        reason: decisionNote ?? null,
        changeSet: {
          fromStatus: "PENDING_REVIEW",
          toStatus: decision.action,
          rejectionReason: approved ? null : decisionNote ?? null,
          decisionNote: decisionNote ?? null,
        },
      },
    });

    await tx.notification.create({
      data: {
        userId: submission.submittedById,
        type: approved ? "SUBMISSION_APPROVED" : "SUBMISSION_REJECTED",
        title: approved ? "Submission approved" : "Submission rejected",
        body: approved
          ? `${submission.farmer.fullName}'s onboarding was approved by admin.`
          : `${submission.farmer.fullName}'s onboarding was rejected. Reason: ${decisionNote}`,
        metadata: {
          submissionId,
          farmerId: submission.farmerId,
          decisionBy: auth.user.id,
        },
      },
    });

    const farmerLinkCandidates: Array<{ id?: string; email?: string; fullName?: string }> = [
      { fullName: submission.farmer.fullName },
    ];
    if (submission.farmer.externalRef) {
      farmerLinkCandidates.push({ id: submission.farmer.externalRef });
      farmerLinkCandidates.push({ email: submission.farmer.externalRef });
    }

    const farmerUsers = await tx.user.findMany({
      where: {
        userRoles: { some: { role: { key: "farmer" } } },
        OR: farmerLinkCandidates,
      },
      select: { id: true },
    });

    if (farmerUsers.length > 0) {
      await tx.notification.createMany({
        data: farmerUsers.map((item) => ({
          userId: item.id,
          type: approved ? "SUBMISSION_APPROVED" : "SUBMISSION_REJECTED",
          title: approved ? "Your onboarding was approved" : "Your onboarding was rejected",
          body: approved
            ? "Your profile has been approved and is now active."
            : `Please contact your agronomist for correction. Reason: ${decisionNote}`,
          metadata: {
            submissionId,
            farmerId: submission.farmerId,
          },
        })),
      });
    }

    await recomputeFarmerQualityScore(tx, submission.farmerId);
  });

  await logAudit({
    action: "SUBMISSION_DECIDED",
    userId: auth.user.id,
    details: {
      submissionId,
      farmerId: submission.farmerId,
      decision: decision.action,
      note: decisionNote ?? null,
    },
    ip,
    userAgent,
    status: "SUCCESS",
  });

  return NextResponse.json({ message: "Decision recorded." });
}
