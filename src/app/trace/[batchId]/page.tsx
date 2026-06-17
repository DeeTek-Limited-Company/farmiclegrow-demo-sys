import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildOrgTraceUrl, resolvePublicSiteBaseUrl } from "@/lib/trace/urls";

type PageProps = {
  params: Promise<{ batchId: string }>;
};

export default async function TraceBatchPage({ params }: PageProps) {
  const { batchId } = await params;
  const base = resolvePublicSiteBaseUrl({
    configuredUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL,
    nodeEnv: process.env.NODE_ENV,
  });
  if (!base) {
    redirect("/");
  }
  const batch = await prisma.batch.findFirst({
    where: { batchId },
    select: { batchId: true, organization: { select: { slug: true } } },
  });

  if (!batch) {
    redirect(`${base}/trace/${encodeURIComponent(batchId)}`);
  }

  redirect(
    buildOrgTraceUrl({
      orgSlug: batch.organization.slug,
      batchId: batch.batchId,
      configuredUrl: base,
      nodeEnv: process.env.NODE_ENV,
    }),
  );
}
