import { prisma } from "@/lib/prisma";

export type AuditAction = 
  | "USER_LOGIN_SUCCESS"
  | "USER_LOGIN_FAILED"
  | "USER_LOGOUT"
  | "BUYER_SIGNUP"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_STATUS_TOGGLED"
  | "BILLING_PLAN_CREATED"
  | "BILLING_PLAN_UPDATED"
  | "BILLING_PLAN_ARCHIVED"
  | "ORG_SUBSCRIPTION_UPDATED"
  | "BILLING_LIMIT_BLOCKED"
  | "FARMER_CREATED"
  | "FARMER_UPDATED"
  | "FARMER_DELETED"
  | "BATCH_CREATED"
  | "BATCH_UPDATED_VISIBILITY"
  | "BATCH_UPDATED_PUBLIC_TRACE_POLICY"
  | "DOCUMENT_REGISTERED"
  | "DOCUMENT_STATUS_UPDATED"
  | "AGRONOMIST_ASSIGNMENTS_UPDATED"
  | "PASSWORD_RESET_SUCCESS"
  | "PASSWORD_RESET_FAILED"
  | "SUBMISSION_DECIDED"
  | "MARKETPLACE_LISTING_CREATED"
  | "MARKETPLACE_LISTING_UPDATED"
  | "MARKETPLACE_LISTING_DELETED"
  | "ORGANIZATION_CREATED"
  | "ORGANIZATION_UPDATED"
  | "ORG_SETTINGS_UPDATED";

export interface AuditLogParams {
  action: AuditAction;
  organizationId?: string;
  userId?: string;
  details?: any;
  ip?: string;
  userAgent?: string;
  status?: "SUCCESS" | "FAILURE";
}

/**
 * Utility to record security and administrative events.
 */
export async function logAudit({
  action,
  organizationId,
  userId,
  details,
  ip,
  userAgent,
  status = "SUCCESS"
}: AuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        organizationId,
        userId,
        details: details || {},
        ip,
        userAgent,
        status,
      },
    });
  } catch (error) {
    // We fail silently to not block the main request if logging fails,
    // but in production, you'd want to pipe this to a fallback logger.
    console.error("Critical: Audit logging failed", error);
  }
}
