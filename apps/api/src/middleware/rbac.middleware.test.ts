import assert from 'node:assert';
import { describe, it } from 'node:test';
import type { Request, Response } from 'express';
import { rbacMiddleware } from './rbac.middleware';
import { AppError } from './errorHandler.middleware';

function invoke(
  allowedRoles: Parameters<typeof rbacMiddleware>[0],
  userRole: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = { user: { role: userRole, userId: 'u1' } } as Request;
    const middleware = rbacMiddleware(allowedRoles);
    middleware(req, {} as Response, (err?: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

describe('rbacMiddleware (settlement write)', () => {
  const SETTLEMENT_WRITE = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTING'] as const;

  it('allows COMPANY_ADMIN', async () => {
    await invoke([...SETTLEMENT_WRITE], 'COMPANY_ADMIN');
  });

  it('allows ACCOUNTING', async () => {
    await invoke([...SETTLEMENT_WRITE], 'ACCOUNTING');
  });

  it('denies DISPATCHER (finalize / create)', async () => {
    await assert.rejects(
      () => invoke([...SETTLEMENT_WRITE], 'DISPATCHER'),
      (err: unknown) => err instanceof AppError && err.code === 'FORBIDDEN',
    );
  });
});

describe('rbacMiddleware (load write)', () => {
  const LOAD_WRITE = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'DISPATCHER'] as const;

  it('allows DISPATCHER', async () => {
    await invoke([...LOAD_WRITE], 'DISPATCHER');
  });

  it('denies ACCOUNTING', async () => {
    await assert.rejects(
      () => invoke([...LOAD_WRITE], 'ACCOUNTING'),
      (err: unknown) => err instanceof AppError && err.code === 'FORBIDDEN',
    );
  });
});
