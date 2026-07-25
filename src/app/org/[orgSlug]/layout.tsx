import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type OrgLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
};

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { orgSlug } = await params;

  if (!orgSlug) {
    notFound();
  }

  const organization = await prisma.organization.findUnique({
    where: { slug: orgSlug.toLowerCase().trim() },
    select: { id: true, status: true },
  });

  if (!organization || organization.status === "SUSPENDED") {
    notFound();
  }

  return <>{children}</>;
}
