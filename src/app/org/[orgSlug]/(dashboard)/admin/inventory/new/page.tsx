import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { ListingCreateForm } from "@/components/admin/listing-create-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { requireOrgScope } from "@/lib/tenant/scope";

export default async function NewListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ batchId?: string }>;
}) {
  const { orgSlug } = await params;
  const user = await requireRole(["admin", "ops"]);
  const organizationId = requireOrgScope(user);
  const orgBase = `/org/${orgSlug}`;
  const { batchId } = await searchParams;

  if (!batchId) {
    redirect(`${orgBase}/admin/inventory`);
  }

  const batch = await prisma.batch.findFirst({
    where: { id: batchId, organizationId },
    include: {
      farmer: true,
      productionRecord: true,
    },
  });

  if (!batch) {
    redirect(`${orgBase}/admin/inventory`);
  }

  // If already listed, redirect to edit
  const existing = await prisma.marketplaceListing.findFirst({
    where: { batchId, organizationId },
  });
  if (existing) {
    redirect(`${orgBase}/admin/inventory/edit/${existing.id}`);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Create Marketplace Listing</h1>
        <p className="text-muted-foreground mt-2">
          Transform batch <span className="font-mono text-primary">{batch.batchId}</span> into a verified product listing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-primary/10 bg-primary/[0.02]">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Batch Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-[10px] font-bold uppercase text-slate-400">Farmer</Label>
              <p className="text-sm font-bold">{batch.farmer.fullName}</p>
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase text-slate-400">Crop</Label>
              <p className="text-sm font-bold">{batch.productionRecord.cropType}</p>
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase text-slate-400">Available Quantity</Label>
              <p className="text-sm font-bold">{Number(batch.quantity).toLocaleString()}T</p>
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase text-slate-400">Harvest Date</Label>
              <p className="text-sm font-bold">{new Date(batch.harvestDate).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2">
          <ListingCreateForm batch={JSON.parse(JSON.stringify(batch))} />
        </div>
      </div>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={className}>{children}</span>;
}
