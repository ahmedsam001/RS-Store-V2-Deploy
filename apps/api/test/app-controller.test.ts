import test from 'node:test';
import assert from 'node:assert/strict';
import { AppController } from '../src/app.controller';

test('root route response points clients to health check', () => {
  const controller = new AppController();

  assert.deepEqual(controller.getRoot(), {
    message: 'RS Store API is running',
    health: '/api/v1/health',
    docs: null,
  });
});
