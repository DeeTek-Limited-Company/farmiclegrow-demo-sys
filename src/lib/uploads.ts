const FALLBACK_ORIGIN = "http://local.test";
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);
const DOCUMENT_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png"]);

export type UploadKind = "docs" | "photos" | "certs";

function getExtensionFromDataUrl(value: string): string | null {
  const prefix = value.slice(0, 80).toLowerCase();
  if (prefix.startsWith("data:application/pdf")) return "pdf";
  if (prefix.startsWith("data:image/jpeg")) return "jpeg";
  if (prefix.startsWith("data:image/jpg")) return "jpg";
  if (prefix.startsWith("data:image/png")) return "png";
  return null;
}

function getExtensionFromPathname(pathname: string): string | null {
  const cleaned = pathname.trim().toLowerCase();
  if (!cleaned) return null;
  const lastSegment = cleaned.split("/").pop() || "";
  const dotIndex = lastSegment.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === lastSegment.length - 1) return null;
  return lastSegment.slice(dotIndex + 1);
}

function getExtensionFromReference(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("data:")) {
    return getExtensionFromDataUrl(trimmed);
  }

  try {
    const parsed = new URL(trimmed, FALLBACK_ORIGIN);
    const pathnameExt = getExtensionFromPathname(parsed.pathname);
    if (pathnameExt) return pathnameExt;

    if (parsed.pathname === "/api/uploads/object") {
      const key = parsed.searchParams.get("key") || "";
      return getExtensionFromPathname(key);
    }

    return null;
  } catch {
    return null;
  }
}

function hasAllowedExtension(value: string, allowedExtensions: Set<string>) {
  const ext = getExtensionFromReference(value);
  return ext ? allowedExtensions.has(ext) : false;
}

export function isAllowedImageReference(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return hasAllowedExtension(trimmed, IMAGE_EXTENSIONS);
}

export function isAllowedDocumentReference(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return hasAllowedExtension(trimmed, DOCUMENT_EXTENSIONS);
}

export function buildLocalUploadPath({
  kind,
  datePrefix,
  fileName,
  extension,
}: {
  kind: UploadKind;
  datePrefix: string;
  fileName: string;
  extension: string;
}) {
  return `/uploads/${kind}/${datePrefix}/${fileName}.${extension}`;
}

export function getUploadDisplayName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed, FALLBACK_ORIGIN);
    if (parsed.pathname === "/api/uploads/object") {
      const key = parsed.searchParams.get("key") || "";
      return key.split("/").pop() || key;
    }

    return parsed.pathname.split("/").pop() || trimmed;
  } catch {
    return trimmed.split("/").pop() || trimmed;
  }
}

export function isSupabaseStorageConfigured(env: NodeJS.ProcessEnv) {
  return Boolean(
    (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL) && env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
