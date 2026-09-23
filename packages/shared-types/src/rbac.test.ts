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

  it('DISPATCHER can dispatch and cancel loads', () => {
    assert.equal(roleHasPermission(UserRole.DISPATCHER, 'loads:dispatch'), true);
    assert.equal(roleHasPermission(UserRole.DISPATCHER, 'loads:cancel'), true);
  });

  it('ACCOUNTING can finalize settlements but not dispatch loads', () => {
    assert.equal(roleHasPermission(UserRole.ACCOUNTING, 'settlements:finalize'), true);
    assert.equal(roleHasPermission(UserRole.ACCOUNTING, 'loads:dispatch'), false);
  });

  it('DRIVER can only access the self-service portal', () => {
    assert.equal(roleHasPermission(UserRole.DRIVER, 'fleet:dashboard'), true);
    assert.equal(roleHasPermission(UserRole.DRIVER, 'portal:my-loads'), true);
    assert.equal(roleHasPermission(UserRole.DRIVER, 'portal:my-fuel'), true);
    assert.equal(roleHasPermission(UserRole.DRIVER, 'portal:my-statements'), true);
    assert.equal(roleHasPermission(UserRole.DRIVER, 'portal:my-compliance'), true);
    assert.equal(roleHasPermission(UserRole.DRIVER, 'loads:list'), false);
    assert.equal(roleHasPermission(UserRole.DRIVER, 'loads:dispatch'), false);
    assert.equal(roleHasPermission(UserRole.DRIVER, 'settlements:list'), false);
    assert.equal(roleHasPermission(UserRole.DRIVER, 'settlements:create'), false);
  });

  it('office staff do not get the driver portal pages', () => {
    assert.equal(roleHasPermission(UserRole.COMPANY_ADMIN, 'portal:my-loads'), false);
    assert.equal(roleHasPermission(UserRole.DISPATCHER, 'portal:my-loads'), false);
    assert.equal(roleHasPermission(UserRole.ACCOUNTING, 'portal:my-fuel'), false);
    assert.equal(roleHasPermission(UserRole.COMPANY_ADMIN, 'portal:my-compliance'), false);
  });

  it('driver cannot view passwords', () => {
    assert.equal(roleHasPermission(UserRole.DRIVER, 'passwords:view'), false);
    assert.equal(roleHasPermission(UserRole.DRIVER, 'passwords:manage'), false);
  });

  it('dispatcher cannot view the credential vault', () => {
    assert.equal(roleHasPermission(UserRole.DISPATCHER, 'passwords:view'), false);
    assert.equal(roleHasPermission(UserRole.DISPATCHER, 'passwords:manage'), false);
  });

  it('company admin can manage passwords', () => {
    assert.equal(roleHasPermission(UserRole.COMPANY_ADMIN, 'passwords:manage'), true);
  });

  it('dispatcher can add brokers while booking loads', () => {
    assert.equal(roleHasPermission(UserRole.DISPATCHER, 'brokers:list'), true);
    assert.equal(roleHasPermission(UserRole.DISPATCHER, 'brokers:write'), true);
  });

  it('accounting can read brokers but not edit them', () => {
    assert.equal(roleHasPermission(UserRole.ACCOUNTING, 'brokers:list'), true);
    assert.equal(roleHasPermission(UserRole.ACCOUNTING, 'brokers:write'), false);
  });

  it('driver cannot access brokers', () => {
    assert.equal(roleHasPermission(UserRole.DRIVER, 'brokers:list'), false);
    assert.equal(roleHasPermission(UserRole.DRIVER, 'brokers:write'), false);
  });
});
