import assert from 'node:assert';
import { describe, it } from 'node:test';
import { tenantWhere } from './tenant-scope';

describe('tenantWhere', () => {
  it('always includes companyId', () => {
    assert.deepEqual(tenantWhere('tenant-a'), { companyId: 'tenant-a' });
  });

  it('merges id filter for cross-tenant lookups', () => {
    const where = tenantWhere('tenant-a', { id: 'record-b' });
    assert.equal(where.companyId, 'tenant-a');
    assert.equal(where.id, 'record-b');
    /** Prisma findFirst with this where returns null if record-b belongs to tenant-b → 404 */
  });
});
