import { requireRole } from "@/lib/auth/server";
import { LogoutButton } from "@/components/auth/logout-button";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function OpsPage() {
  const user = await requireRole(["admin", "ops"]);
  if (!user.organizationId) {
    redirect("/forbidden");
  }
  const orgId = user.organizationId;
  const [totalFarmers, pendingSubmissions, approvedSubmissions, unreadNotifications, recentFarmers] =
    await Promise.all([
      prisma.farmer.count({ where: { organizationId: orgId } }),
      prisma.farmerSubmission.count({ where: { status: "PENDING_REVIEW", organizationId: orgId } }),
      prisma.farmerSubmission.count({ where: { status: "APPROVED", organizationId: orgId } }),
      prisma.notification.count({ where: { isRead: false, organizationId: orgId } }),
      prisma.farmer.findMany({
        where: { organizationId: orgId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          fullName: true,
          submissions: {
            orderBy: { submittedAt: "desc" },
            take: 1,
            select: { status: true },
          },
        }
      }),
    ]);

  return (
    <main style={{ padding: "3rem", fontFamily: "var(--font-geist-sans)" }}>
      <h1>Operations console</h1>
      <p>Welcome, {user.name}</p>
      <p>Roles: {user.roles.join(", ")}</p>
      <section style={{ marginTop: "1rem", border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1rem" }}>
        <h2 style={{ marginBottom: "0.5rem" }}>Operational metrics</h2>
        <p>Total farmers onboarded: {totalFarmers}</p>
        <p>Pending approvals: {pendingSubmissions}</p>
        <p>Approved submissions: {approvedSubmissions}</p>
        <p>Unread notifications: {unreadNotifications}</p>
      </section>

      <section style={{ marginTop: "1rem", border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1rem" }}>
        <h2 style={{ marginBottom: "0.5rem" }}>Recently updated profiles</h2>
        {recentFarmers.length === 0 ? <p>No farmer profiles yet.</p> : null}
        {recentFarmers.length > 0 ? (
          <ul style={{ marginLeft: "1rem", display: "grid", gap: "0.35rem" }}>
            {recentFarmers.map((farmer) => (
              <li key={farmer.id}>
                {farmer.fullName} - latest status: {farmer.submissions[0]?.status ?? "No submission"}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <div style={{ marginTop: "1rem" }}>
        <LogoutButton />
      </div>
    </main>
  );
}
