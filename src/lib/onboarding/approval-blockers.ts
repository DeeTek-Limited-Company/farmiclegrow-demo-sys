export type SubmissionApprovalBlockerFarmer = {
  phone: string | null;
  ghanaCardNumber: string | null;
  primaryCrop: string | null;
  farmProfiles: Array<{
    farmName: string | null;
    locations: Array<{
      latitude: unknown;
      longitude: unknown;
      isValidated: boolean | null;
    }>;
  }>;
};

export function getSubmissionApprovalBlockers(
  farmer: SubmissionApprovalBlockerFarmer,
): string[] {
  const profile = farmer.farmProfiles[0] ?? null;
  const location = profile?.locations[0] ?? null;
  const hasGps = Boolean(
    location && location.latitude != null && location.longitude != null,
  );

  const blockers: string[] = [];

  if (!farmer.phone) blockers.push("Phone");
  if (!farmer.ghanaCardNumber) blockers.push("Ghana Card");
  if (!profile?.farmName) blockers.push("Farm Name");
  if (!farmer.primaryCrop) blockers.push("Primary Crop");
  if (!hasGps) blockers.push("GPS Location");
  if (location && !location.isValidated) blockers.push("GPS Validation");

  return blockers;
}
