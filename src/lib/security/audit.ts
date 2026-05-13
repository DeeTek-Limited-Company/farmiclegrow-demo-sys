import { prisma } from "@/lib/prisma";

export type AuditAction = 
  | "USER_LOGIN_SUCCESS"
  | "USER_LOGIN_FAILED"
  | "USER_LOGOUT"
  | "BUYER_SIGNUP"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_STATUS_TOGGLED"
  | "FARMER_CREATED"
  | "FARMER_UPDATED"
  | "FARMER_DELETED"
  | "BATCH_CREATED"
  | "DOCUMENT_REGISTERED"
  | "DOCUMENT_STATUS_UPDATED"
  | "AGRONOMIST_ASSIGNMENTS_UPDATED"
  | "PASSWORD_RESET_SUCCESS"
  | "PASSWORD_RESET_FAILED"
  | "SUBMISSION_DECIDED"
  | "MARKETPLACE_LISTING_CREATED"
  | "MARKETPLACE_LISTING_UPDATED"
  | "MARKETPLACE_LISTING_DELETED";

export interface AuditLogParams {
  action: AuditAction;
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
