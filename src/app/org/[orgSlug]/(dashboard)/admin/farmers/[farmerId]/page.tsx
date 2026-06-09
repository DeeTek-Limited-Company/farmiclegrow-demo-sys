import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/server";

type PageProps = {
  params: Promise<{ orgSlug: string; farmerId: string }>;
};

export default async function AdminFarmerRedirectPage({ params }: PageProps) {
  await requireRole(["admin"]);
  const { orgSlug, farmerId } = await params;
  redirect(`/org/${orgSlug}/agronomist/farmers/${farmerId}`);
}
