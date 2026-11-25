import test from 'node:test';
import assert from 'node:assert/strict';
import { getShares, remaining, normalizePayments } from './calculations.js';
import { sampleData } from './sampleData.js';

test('different products have different participants', () => {
  assert.deepEqual(getShares(sampleData()[0].products), { A: 11000, B: 11000, C: 11000, D: 11000, E: 20000 });
  assert.equal(remaining(11000, 0), 11000);
  assert.equal(remaining(11000, 11000), 0);
});

test('buyer can be excluded', () => {
  assert.deepEqual(getShares([{ price: 20000, people: ['B', 'C', 'D', 'E'] }]), { A: 0, B: 5000, C: 5000, D: 5000, E: 5000 });
});

test('rounding preserves total; quantity does not multiply total price', () => {
  assert.deepEqual(getShares([{ price: 10, quantity: 5, people: ['A', 'B', 'C'] }]), { A: 3.34, B: 3.33, C: 3.33, D: 0, E: 0 });
});

test('old saved payments become paid only when the full share was covered', () => {
  const purchase = { ...sampleData()[0], payments: { B: 5000, C: 11000, D: true } };
  const [updated] = normalizePayments([purchase]);
  assert.equal(updated.payments.B, false);
  assert.equal(updated.payments.C, true);
  assert.equal(updated.payments.D, true);
  assert.equal(updated.payments.E, false);
});
