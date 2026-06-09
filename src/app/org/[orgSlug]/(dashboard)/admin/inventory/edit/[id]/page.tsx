import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { ListingEditForm } from "@/components/admin/listing-edit-form";
import { redirect, notFound } from "next/navigation";
import { requireOrgScope } from "@/lib/tenant/scope";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const user = await requireRole(["admin", "ops"]);
  const organizationId = requireOrgScope(user);
  const { id } = await params;

  const listing = await prisma.marketplaceListing.findFirst({
    where: { id, organizationId },
  });

  if (!listing) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Edit Marketplace Listing</h1>
        <p className="text-muted-foreground mt-2">
          Update the commercial details and visibility of your product.
        </p>
      </div>

      <ListingEditForm listing={JSON.parse(JSON.stringify(listing))} />
    </div>
  );
}
