import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/server";

type PageProps = {
  params: Promise<{ farmerId: string }>;
};

export default async function AdminFarmerRedirectPage({ params }: PageProps) {
  await requireRole(["admin"]);
  const { farmerId } = await params;
  redirect(`/agronomist/farmers/${farmerId}`);
}

