export interface DirectoryBroker {
  id: string;
  name: string;
  mcNumber: string;
}

export interface LoadBrokerFields {
  brokerId: string | null;
  brokerMC: string | null;
  brokerName: string;
}

const COMPANY_SUFFIXES = new Set(['llc', 'inc', 'incorporated', 'corp', 'corporation', 'co', 'company', 'ltd']);

export function normalizeBrokerName(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  while (words.length > 1 && COMPANY_SUFFIXES.has(words[words.length - 1])) words.pop();
  return words.join(' ');
}

/**
 * Loads entered before the broker directory existed carry only a free-text name (and maybe an MC),
 * so report grouping has to resolve them to the same broker as newer, linked loads.
 */
export function createBrokerResolver(brokers: DirectoryBroker[]) {
  const byId = new Map(brokers.map((b) => [b.id, b]));
  const byMc = new Map(brokers.map((b) => [b.mcNumber, b]));
  const byName = new Map<string, DirectoryBroker | null>();
  for (const broker of brokers) {
    const key = normalizeBrokerName(broker.name);
    byName.set(key, byName.has(key) ? null : broker);
  }

  return (load: LoadBrokerFields): { key: string; name: string } => {
    const mc = (load.brokerMC || '').replace(/\D/g, '');
    const broker =
      (load.brokerId ? byId.get(load.brokerId) : undefined) ??
      (mc ? byMc.get(mc) : undefined) ??
      byName.get(normalizeBrokerName(load.brokerName)) ??
      undefined;
    if (broker) return { key: `broker:${broker.id}`, name: broker.name };
    const normalized = normalizeBrokerName(load.brokerName);
    return { key: `name:${normalized || load.brokerName}`, name: load.brokerName.trim() || 'Unknown broker' };
  };
}
