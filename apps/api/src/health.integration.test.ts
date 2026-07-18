import assert from 'node:assert';
import { describe, it } from 'node:test';
import request from 'supertest';
import app from './app';
import { prisma } from './config/database';
import { redis } from './config/redis';

const RUN_INTEGRATION = process.env.HAULYARD_INTEGRATION === '1';

describe('API integration', { skip: !RUN_INTEGRATION }, () => {
  it('GET /health returns healthy when DB and Redis are up', async () => {
    await redis.connect();
    await prisma.$connect();

    const res = await request(app).get('/health').expect(200);
    assert.equal(res.body.data.status, 'healthy');
    assert.equal(res.body.data.services.database, 'connected');
    assert.equal(res.body.data.services.redis, 'connected');
  });

  it('GET /api/v1/setup/status returns setupRequired boolean', async () => {
    const res = await request(app).get('/api/v1/setup/status').expect(200);
    assert.equal(typeof res.body.data.setupRequired, 'boolean');
  });
});
