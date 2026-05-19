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
