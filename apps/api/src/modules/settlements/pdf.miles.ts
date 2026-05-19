export interface LoadMileInput {
  loadedMiles?: number | null;
  deadheadMiles?: number | null;
  totalMiles?: number | null;
}

export function getLoadMiles(load: LoadMileInput) {
  const loadedMiles = load.loadedMiles ?? 0;
  const deadheadMiles = load.deadheadMiles ?? 0;
  const totalMiles = load.totalMiles ?? loadedMiles + deadheadMiles;
  return { loadedMiles, deadheadMiles, totalMiles };
}

export function sumSettlementLineMiles(lines: LoadMileInput[]) {
  let totalDeadheadMiles = 0;
  let totalLoadedMiles = 0;
  let totalMilesCount = 0;

  for (const line of lines) {
    const { loadedMiles, deadheadMiles, totalMiles } = getLoadMiles(line);
    totalDeadheadMiles += deadheadMiles;
    totalLoadedMiles += loadedMiles;
    totalMilesCount += totalMiles;
  }

  return { totalDeadheadMiles, totalLoadedMiles, totalMilesCount };
}
