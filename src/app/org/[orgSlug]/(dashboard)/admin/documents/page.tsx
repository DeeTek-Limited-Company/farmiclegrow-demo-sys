import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { DocumentReviewTable } from "@/components/admin/document-review-table";

export default async function AdminDocumentsPage() {
  await requireRole(["admin", "ops"]);

  const documents = await prisma.document.findMany({
    where: { status: { in: ["UPLOADED", "NEEDS_REVIEW", "MISSING"] } },
    include: {
      farmer: { select: { id: true, fullName: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Document Review</h1>
        <p className="text-muted-foreground mt-2">Verify farmer documents and keep compliance up to date.</p>
      </div>

      <DocumentReviewTable initialDocuments={JSON.parse(JSON.stringify(documents))} />
    </div>
  );
}
