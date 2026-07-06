import assert from 'node:assert';
import { describe, it } from 'node:test';
import { isCompanyAssignableRole, COMPANY_ASSIGNABLE_ROLES } from './users.roles';

describe('users.roles', () => {
  it('allows company-managed staff roles', () => {
    for (const role of ['COMPANY_ADMIN', 'DISPATCHER', 'ACCOUNTING', 'DRIVER']) {
      assert.equal(isCompanyAssignableRole(role), true);
    }
  });

  it('rejects super admin assignment', () => {
    assert.equal(isCompanyAssignableRole('SUPER_ADMIN'), false);
  });

  it('exports stable assignable role list', () => {
    assert.deepEqual(COMPANY_ASSIGNABLE_ROLES.map(String), [
      'COMPANY_ADMIN',
      'DISPATCHER',
      'ACCOUNTING',
      'DRIVER',
    ]);
  });
});
