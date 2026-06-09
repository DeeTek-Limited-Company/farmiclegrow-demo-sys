CREATE TABLE "OrganizationTraceTheme" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "heroTitle" TEXT,
    "heroSubtitle" TEXT,
    "logoUrl" TEXT,
    "wordmarkUrl" TEXT,
    "primaryColor" TEXT,
    "accentColor" TEXT,
    "surfaceColor" TEXT,
    "backgroundStyle" TEXT,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "footerNote" TEXT,
    "showOrgStory" BOOLEAN NOT NULL DEFAULT false,
    "storyTitle" TEXT,
    "storyBody" TEXT,
    "storyImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationTraceTheme_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationTraceTheme_organizationId_key" ON "OrganizationTraceTheme"("organizationId");

ALTER TABLE "OrganizationTraceTheme"
ADD CONSTRAINT "OrganizationTraceTheme_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
