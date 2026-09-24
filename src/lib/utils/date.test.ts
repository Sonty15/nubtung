import { describe, it } from 'node:test';
import assert from 'node:assert';
// @ts-expect-error - node test runner requires .ts extension for ESM strip-types
import { getBangkokDateString, getBangkokTimeString, getBangkokTimeShortString, getBangkokDateTime } from './date.ts';

describe('Bangkok UTC+7 Date Utilities', () => {
  it('formats UTC midnight correctly as 07:00:00 Bangkok time', () => {
    // 2026-09-24T00:00:00Z is 2026-09-24T07:00:00 in Bangkok (UTC+7)
    const utcMidnight = new Date('2026-09-24T00:00:00Z');
    assert.strictEqual(getBangkokDateString(utcMidnight), '2026-09-24');
    assert.strictEqual(getBangkokTimeString(utcMidnight), '07:00:00');
    assert.strictEqual(getBangkokTimeShortString(utcMidnight), '07:00');
  });

  it('handles day change correctly when UTC is late night', () => {
    // 2026-09-23T20:30:00Z is 2026-09-24T03:30:00 in Bangkok (next day!)
    const lateUtc = new Date('2026-09-23T20:30:00Z');
    assert.strictEqual(getBangkokDateString(lateUtc), '2026-09-24');
    assert.strictEqual(getBangkokTimeString(lateUtc), '03:30:00');
    assert.strictEqual(getBangkokTimeShortString(lateUtc), '03:30');
  });

  it('getBangkokDateTime returns matching date and time', () => {
    const dt = new Date('2026-09-24T05:15:30Z'); // 12:15:30 in Bangkok
    const res = getBangkokDateTime(dt);
    assert.strictEqual(res.date, '2026-09-24');
    assert.strictEqual(res.time, '12:15:30');
  });
});
