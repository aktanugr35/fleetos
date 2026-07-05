import { AppError } from '../../middleware/errorHandler.middleware';

export interface ZipLookupResult {
  zip: string;
  city: string;
  state: string;
}

export function normalizeUsZip(input: string): string {
  return input.replace(/\D/g, '').slice(0, 5);
}

export async function lookupUsZip(input: string): Promise<ZipLookupResult> {
  const zip = normalizeUsZip(input);
  if (!/^\d{5}$/.test(zip)) {
    throw new AppError(400, 'INVALID_ZIP', 'Enter a valid 5-digit US ZIP code');
  }

  const response = await fetch(`https://api.zippopotam.us/us/${zip}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new AppError(404, 'ZIP_NOT_FOUND', 'ZIP code not found');
  }

  const data = (await response.json()) as {
    places?: Array<{ 'place name': string; 'state abbreviation': string }>;
  };

  const place = data.places?.[0];
  if (!place) {
    throw new AppError(404, 'ZIP_NOT_FOUND', 'ZIP code not found');
  }

  return {
    zip,
    city: place['place name'],
    state: place['state abbreviation'],
  };
}
