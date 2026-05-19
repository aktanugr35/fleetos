import assert from 'node:assert';
import { describe, it } from 'node:test';
import { UserRole } from './enums';
import { roleHasPermission } from './rbac';

describe('roleHasPermission', () => {
  it('SUPER_ADMIN has all permissions', () => {
    assert.equal(roleHasPermission(UserRole.SUPER_ADMIN, 'settlements:finalize'), true);
    assert.equal(roleHasPermission(UserRole.SUPER_ADMIN, 'company:write'), true);
  });

  it('DISPATCHER cannot create or finalize settlements', () => {
    assert.equal(roleHasPermission(UserRole.DISPATCHER, 'settlements:create'), false);
    assert.equal(roleHasPermission(UserRole.DISPATCHER, 'settlements:finalize'), false);
  });

  it('DISPATCHER can dispatch loads but not cancel', () => {
    assert.equal(roleHasPermission(UserRole.DISPATCHER, 'loads:dispatch'), true);
    assert.equal(roleHasPermission(UserRole.DISPATCHER, 'loads:cancel'), false);
  });

  it('ACCOUNTING can finalize settlements but not dispatch loads', () => {
    assert.equal(roleHasPermission(UserRole.ACCOUNTING, 'settlements:finalize'), true);
    assert.equal(roleHasPermission(UserRole.ACCOUNTING, 'loads:dispatch'), false);
  });

  it('DRIVER has read-only fleet permissions', () => {
    assert.equal(roleHasPermission(UserRole.DRIVER, 'loads:list'), true);
    assert.equal(roleHasPermission(UserRole.DRIVER, 'loads:dispatch'), false);
    assert.equal(roleHasPermission(UserRole.DRIVER, 'settlements:create'), false);
  });
});
