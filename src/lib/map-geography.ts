export const CONTINENTS = [1, 2, 3, 4] as const;
export const UNKNOWN_LOCATION = 'unknown';

export function regionsForContinent(continent: string): number[] {
  if (!CONTINENTS.some(value => String(value) === continent)) return [];
  return Array.from({ length: continent === '4' ? 12 : 9 }, (_, index) => index + 1);
}

export function mapLocation(continent: string, region: string) {
  if (!CONTINENTS.some(value => String(value) === continent)) return { continent: null, region: null };
  const validRegion = regionsForContinent(continent).includes(Number(region));
  return { continent: Number(continent), region: validRegion ? Number(region) : null };
}