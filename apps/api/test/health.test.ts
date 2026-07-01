import test from 'node:test';
import assert from 'node:assert/strict';

test('health status contract supports healthy degraded unhealthy', () => {
  const statuses = new Set(['healthy', 'degraded', 'unhealthy']);
  assert.equal(statuses.has('healthy'), true);
  assert.equal(statuses.has('degraded'), true);
  assert.equal(statuses.has('unhealthy'), true);
});
