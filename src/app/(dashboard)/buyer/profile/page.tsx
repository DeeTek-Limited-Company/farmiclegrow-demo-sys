import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { BuyerProfileForm } from "@/components/buyer/buyer-profile-form";

export default async function BuyerProfilePage() {
  const user = await requireRole(["buyer"]);

  const profile = await prisma.buyerProfile.findUnique({
    where: { userId: user.id },
  });

  const initialData = profile
    ? {
        companyName: profile.companyName,
        phoneNumber: profile.phoneNumber || "",
        businessAddress: profile.businessAddress || "",
        country: profile.country || "",
        taxId: profile.taxId || "",
        businessType: profile.businessType || "",
      }
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your business information for orders and invoicing.
        </p>
      </div>

      <BuyerProfileForm initialData={initialData} />
    </div>
  );
}
