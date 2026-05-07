export type SeasonOption = { value: string; label: string };

export function getNorthernGhanaSeasonOptions(now: Date = new Date()): SeasonOption[] {
  const year = now.getFullYear();
  const prev = year - 1;
  const next = year + 1;

  return [
    { value: `${prev}-NORTH_RAINY`, label: `${prev} Rainy Season (May–Oct)` },
    { value: `${prev}-${year}-NORTH_DRY`, label: `Dry Season (Nov ${prev}–Apr ${year})` },
    { value: `${year}-NORTH_RAINY`, label: `${year} Rainy Season (May–Oct)` },
    { value: `${year}-${next}-NORTH_DRY`, label: `Dry Season (Nov ${year}–Apr ${next})` },
  ];
}

