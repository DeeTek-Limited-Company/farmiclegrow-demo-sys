import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { recomputeFarmerQualityScore } from "@/lib/quality-score";
import { logAudit } from "@/lib/security/audit";
import { requireOrgScope } from "@/lib/tenant/scope";
import { getSubmissionApprovalBlockers } from "@/lib/onboarding/approval-blockers";

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

  const organizationId = requireOrgScope(auth.user);

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

  const submission = await prisma.farmerSubmission.findFirst({
    where: { id: submissionId, organizationId },
    include: {
      farmer: {
        include: {
          farmProfiles: {
            include: {
              locations: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
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
  const approvalBlockers = approved
    ? getSubmissionApprovalBlockers(submission.farmer)
    : [];

  if (approvalBlockers.length > 0) {
    return NextResponse.json(
      {
        message: "Resolve onboarding blockers before approval.",
        blockers: approvalBlockers,
      },
      { status: 409 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.farmerSubmission.updateMany({
      where: { id: submissionId, organizationId: submission.organizationId },
      data: {
        status: decision.action,
        rejectionReason: approved ? null : decisionNote ?? null,
        decidedAt: new Date(),
      },
    });

    await tx.approvalAction.create({
      data: {
        organizationId: submission.organizationId,
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
        organizationId: submission.organizationId,
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

    await recomputeFarmerQualityScore(tx, submission.farmerId);
  });

  await logAudit({
    action: "SUBMISSION_DECIDED",
    organizationId,
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
