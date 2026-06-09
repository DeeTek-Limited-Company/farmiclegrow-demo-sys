function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

export function buildOrgTracePath(orgSlug: string, batchId: string) {
  return `/org/${encodeURIComponent(orgSlug)}/trace/${encodeURIComponent(batchId)}`;
}

export function buildInternalOrgTracePath(orgSlug: string, batchId: string) {
  return `/org/${encodeURIComponent(orgSlug)}/trace/${encodeURIComponent(batchId)}`;
}

export function resolvePublicSiteBaseUrl({
  configuredUrl,
  nodeEnv,
  windowOrigin,
}: {
  configuredUrl?: string;
  nodeEnv?: string;
  windowOrigin?: string;
} = {}) {
  const configured = (configuredUrl ?? "").trim();
  if (configured) {
    return normalizeBaseUrl(configured);
  }

  if ((nodeEnv ?? process.env.NODE_ENV) !== "production") {
    return "http://localhost:3000";
  }

  if (windowOrigin) {
    return normalizeBaseUrl(windowOrigin);
  }

  return "";
}

export function resolveInternalAppBaseUrl({
  configuredUrl,
  nodeEnv,
  windowOrigin,
}: {
  configuredUrl?: string;
  nodeEnv?: string;
  windowOrigin?: string;
} = {}) {
  const configured = (configuredUrl ?? "").trim();
  if (configured) {
    return normalizeBaseUrl(configured);
  }

  if ((nodeEnv ?? process.env.NODE_ENV) !== "production") {
    return "http://localhost:3001";
  }

  if (windowOrigin) {
    return normalizeBaseUrl(windowOrigin);
  }

  return "";
}

export function buildOrgTraceUrl({
  orgSlug,
  batchId,
  configuredUrl,
  nodeEnv,
  windowOrigin,
}: {
  orgSlug: string;
  batchId: string;
  configuredUrl?: string;
  nodeEnv?: string;
  windowOrigin?: string;
}) {
  const base = resolvePublicSiteBaseUrl({ configuredUrl, nodeEnv, windowOrigin });
  return base ? `${base}${buildOrgTracePath(orgSlug, batchId)}` : buildOrgTracePath(orgSlug, batchId);
}

export function buildInternalOrgTraceUrl({
  orgSlug,
  batchId,
  configuredUrl,
  nodeEnv,
  windowOrigin,
}: {
  orgSlug: string;
  batchId: string;
  configuredUrl?: string;
  nodeEnv?: string;
  windowOrigin?: string;
}) {
  const base = resolveInternalAppBaseUrl({ configuredUrl, nodeEnv, windowOrigin });
  return base
    ? `${base}${buildInternalOrgTracePath(orgSlug, batchId)}`
    : buildInternalOrgTracePath(orgSlug, batchId);
}
