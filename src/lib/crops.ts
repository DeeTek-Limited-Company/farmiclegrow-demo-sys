export const CROP_OPTIONS = [
  "Maize",
  "Rice",
  "Millet",
  "Sorghum",
  "Cowpea",
  "Soybeans",
  "Groundnuts",
  "Cassava",
  "Yam",
  "Sweet Potato",
  "Tomatoes",
  "Onions",
  "Pepper",
  "Okra",
  "Cocoa",
  "Coffee",
  "Palm Oil",
  "Other",
] as const;

export type CropOption = (typeof CROP_OPTIONS)[number];

