import { requireRole } from "@/lib/auth/server";
import { LocationManagement } from "@/components/admin/location-management";

export default async function AdminLocationsPage() {
  await requireRole(["admin"]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
        <p className="text-muted-foreground mt-2">
          Manage the Region → District → Community hierarchy used across onboarding, farmer visibility, and traceability.
        </p>
      </div>
      <LocationManagement />
    </div>
  );
}

