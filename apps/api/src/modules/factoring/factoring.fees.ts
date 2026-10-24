export interface LoadAmounts {
  rateTotal: number;
  detentionPay: number | null;
  lumperFee: number | null;
  tonuAmount: number | null;
}

export interface FeeLoad extends LoadAmounts {
  factoringFeeCents: number | null;
  billingSubmittedAt: Date | null;
  actualDeliveryDate: Date | null;
  deliveryDate: Date | null;
  pickupDate: Date;
}

export function amountCents(load: LoadAmounts) {
  return load.rateTotal + (load.detentionPay ?? 0) + (load.lumperFee ?? 0) + (load.tonuAmount ?? 0);
}

const MONTH_KEY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit' });

/** Totals of the fees entered so far, plus a per-month breakdown keyed by submit (or delivery) month. */
export function summarizeFees(loads: FeeLoad[]) {
  const months = new Map<string, { feeCents: number; grossCents: number; loadCount: number }>();
  let totalFeeCents = 0;
  let grossCents = 0;
  for (const load of loads) {
    const fee = load.factoringFeeCents ?? 0;
    const gross = amountCents(load);
    totalFeeCents += fee;
    grossCents += gross;
    const date = load.billingSubmittedAt ?? load.actualDeliveryDate ?? load.deliveryDate ?? load.pickupDate;
    const key = MONTH_KEY.format(date).slice(0, 7);
    const month = months.get(key) ?? { feeCents: 0, grossCents: 0, loadCount: 0 };
    month.feeCents += fee;
    month.grossCents += gross;
    month.loadCount += 1;
    months.set(key, month);
  }
  return {
    totalFeeCents,
    grossCents,
    loadCount: loads.length,
    byMonth: [...months.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, values]) => ({ month, ...values })),
  };
}
