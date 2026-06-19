import { requireRole } from "@/lib/auth/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileDown, BarChart3, ShieldCheck } from "lucide-react";

export default async function OpsReportsPage() {
  const user = await requireRole(["admin", "ops"]);
  const isAdmin = user.roles.includes("admin") ?? false;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" />
          Reports
        </h1>
        <p className="text-slate-500 mt-2 font-medium">
          Export operational data for oversight and partner reporting.
        </p>
      </div>

      {isAdmin && (
        <Card className="border-2 border-primary/20 shadow-2xl shadow-primary/10 rounded-[2rem] overflow-hidden bg-primary/5">
          <CardHeader className="p-8">
            <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-primary" />
              Full Data Export (Admin Only)
            </CardTitle>
            <CardDescription className="font-medium text-lg">
              Download a comprehensive Excel file with all your organization&apos;s data: farmers, batches, production, and more.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <Button asChild className="rounded-2xl font-black h-14 w-full sm:w-auto text-lg px-10">
              <Link href="/api/reports?kind=full-export">
                <FileDown className="w-5 h-5 mr-2" />
                Download Full Data Export (Excel)
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ReportCard
          title="Farmers"
          description="Profiles, latest onboarding status, GPS and quality score"
          href="/api/reports?kind=farmers"
        />
        <ReportCard
          title="Production"
          description="Lifecycle records with expected vs actual yield"
          href="/api/reports?kind=production"
        />
        <ReportCard
          title="Batches"
          description="Batch registry with trace URLs"
          href="/api/reports?kind=batches"
        />
        <ReportCard
          title="Inputs"
          description="Input traceability and application usage"
          href="/api/reports?kind=inputs"
        />
        <ReportCard
          title="Field Activities"
          description="Farm activities, supervisor verification and logs"
          href="/api/reports?kind=field-activities"
        />
        <ReportCard
          title="Harvest + Quality"
          description="Harvest records with latest quality test snapshot"
          href="/api/reports?kind=harvest-quality"
        />
        <ReportCard
          title="Location Validation"
          description="GPS coverage and validation status by farmer"
          href="/api/reports?kind=location-validation"
        />
      </div>
    </div>
  );
}

function ReportCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  const excelHref = href.includes("?") ? `${href}&format=xlsx` : `${href}?format=xlsx`;
  return (
    <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
      <CardHeader className="p-7">
        <CardTitle className="text-xl font-black tracking-tight">{title}</CardTitle>
        <CardDescription className="font-medium">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-7 pt-0">
        <div className="grid grid-cols-1 gap-3">
          <Button asChild className="rounded-2xl font-black h-12 w-full">
            <Link href={href}>
              <FileDown className="w-4 h-4 mr-2" />
              Download CSV
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-2xl font-black h-12 w-full">
            <Link href={excelHref}>
              <FileDown className="w-4 h-4 mr-2" />
              Download Excel
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
