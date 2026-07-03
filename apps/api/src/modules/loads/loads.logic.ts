import { LoadStatus } from '@fleetos/shared-types';
import type { CreateLoadInput } from './loads.schema';

/** Infer initial load status when not explicitly provided. */
export function inferInitialLoadStatus(
  input: Pick<CreateLoadInput, 'status' | 'deliveryDate'>,
): LoadStatus {
  if (input.status) return input.status;

  const now = new Date();
  if (input.deliveryDate.getTime() <= now.getTime()) {
    return LoadStatus.DELIVERED;
  }

  return LoadStatus.PENDING;
}

/** Next sequence for VT-YYYY-NNNNN after existing load numbers (survives deletions). */
export function nextLoadSequenceNumber(
  loadNumbers: string[],
  year: number,
  prefix = 'VT',
): number {
  const head = `${prefix}-${year}-`;
  let max = 0;
  for (const loadNumber of loadNumbers) {
    if (!loadNumber.startsWith(head)) continue;
    const seq = parseInt(loadNumber.slice(head.length), 10);
    if (!Number.isNaN(seq) && seq > max) max = seq;
  }
  return max + 1;
}

/** Calculate total revenue for a load in cents. */
export function calculateLoadTotalCents(
  input: Pick<
    CreateLoadInput,
    | 'rateType'
    | 'rateCents'
    | 'loadedMiles'
    | 'deadheadMiles'
    | 'detentionCents'
    | 'lumperCents'
    | 'otherChargesCents'
  >,
): number {
  let total = 0;
  const totalMiles = (input.loadedMiles || 0) + (input.deadheadMiles || 0);
  if (input.rateType === 'PER_MILE') {
    total = input.rateCents * totalMiles;
  } else {
    total = input.rateCents;
  }
  total += input.detentionCents || 0;
  total += input.lumperCents || 0;
  total += input.otherChargesCents || 0;
  return total;
}
