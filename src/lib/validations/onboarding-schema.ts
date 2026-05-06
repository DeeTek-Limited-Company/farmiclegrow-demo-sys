import { z } from "zod";

function preprocessEmpty(v: unknown) {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
}

function hasAllowedDocumentType(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;

  if (trimmed.startsWith("data:")) {
    const prefix = trimmed.slice(0, 80).toLowerCase();
    return (
      prefix.startsWith("data:application/pdf") ||
      prefix.startsWith("data:image/jpeg") ||
      prefix.startsWith("data:image/jpg") ||
      prefix.startsWith("data:image/png")
    );
  }

  try {
    const url = new URL(trimmed);
    const pathname = url.pathname.toLowerCase();
    const ext = pathname.split(".").pop() || "";
    return ["pdf", "jpg", "jpeg", "png"].includes(ext);
  } catch {
    return false;
  }
}

function hasAllowedImageType(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;

  if (trimmed.startsWith("data:")) {
    const prefix = trimmed.slice(0, 80).toLowerCase();
    return prefix.startsWith("data:image/jpeg") || prefix.startsWith("data:image/jpg") || prefix.startsWith("data:image/png");
  }

  try {
    const url = new URL(trimmed);
    const pathname = url.pathname.toLowerCase();
    const ext = pathname.split(".").pop() || "";
    return ["jpg", "jpeg", "png"].includes(ext);
  } catch {
    return false;
  }
}

// STEP 1: Personal Information
export const personalSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  phone: z
    .string()
    .regex(
      /^(?:(?:\+233|233|0)[235]\d{8})$/,
      "Invalid Ghana phone number. Use 0XXXXXXXXX or +233XXXXXXXXX"
    ),
  email: z.string().email().optional().or(z.literal("")),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  ghanaCardNumber: z
    .string()
    .regex(/^GHA-\d{9}-\d{1}$/, "Format must be GHA-XXXXXXXXX-X")
    .optional()
    .or(z.literal("")),
  profilePhoto: z.string().optional(),
  ghanaCardPhotoUrl: z
    .preprocess(preprocessEmpty, z.string().trim().min(1))
    .optional()
    .refine((v) => (v ? hasAllowedImageType(v) : true), "Image must be JPG/PNG (URL or data: URI)"),
});

// STEP 2: Location Information
export const locationSchema = z.object({
  districtId: z.string().min(1, "District is required"),
  communityId: z.string().min(1, "Community is required"),
  region: z.string().optional(),
  district: z.string().optional(),
  community: z.string().optional(),
  latitude: z.preprocess(preprocessEmpty, z.coerce.number().min(-90).max(90)).optional(),
  longitude: z.preprocess(preprocessEmpty, z.coerce.number().min(-180).max(180)).optional(),
});

// STEP 3: Farm Profile
export const farmSchema = z.object({
  farmName: z.string().min(1, "Farm name is required"),
  farmSize: z.coerce.number().positive("Farm size must be positive"),
  farmSizeUnit: z.enum(["acres", "hectares"]),
  ownershipType: z.enum(["Owned", "Rented", "Family"]),
  numberOfPlots: z.preprocess(preprocessEmpty, z.coerce.number().int().nonnegative()).optional(),
  irrigationType: z.enum(["Rain-fed", "Irrigated", "Mixed"]),
  farmSitePhotoUrl: z
    .preprocess(preprocessEmpty, z.string().trim().min(1))
    .optional()
    .refine((v) => (v ? hasAllowedImageType(v) : true), "Image must be JPG/PNG (URL or data: URI)"),
});

// STEP 4: Crops (LIGHT ONLY)
export const cropsSchema = z.object({
  primaryCrop: z.string().min(1, "Primary crop is required"),
  secondaryCrops: z.array(z.string().trim().min(1)).optional(),
});

// STEP 5: Certifications
export const certificationSchema = z.object({
  name: z.string().min(1, "Certification name is required"),
  issuingBody: z.string().optional(),
  expiryDate: z.string().optional(),
  documentUrl: z
    .preprocess(preprocessEmpty, z.string().trim().min(1))
    .optional()
    .refine((v) => (v ? hasAllowedDocumentType(v) : true), "Document must be PDF/JPG/PNG (URL or data: URI)"),
});

export const farmerOnboardingSchema = z.object({
  personal: personalSchema,
  location: locationSchema,
  farm: farmSchema,
  crops: cropsSchema,
  certifications: z.array(certificationSchema).optional(),
});

export type FarmerOnboardingData = z.infer<typeof farmerOnboardingSchema>;
