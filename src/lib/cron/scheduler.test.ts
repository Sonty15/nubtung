import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error - node test runner requires .ts extension for ESM strip-types
import { getMillisecondsUntilNextHour, executeDailyEmailSync, startDailyEmailSyncScheduler } from './scheduler.ts';

describe('Scheduler - Daily Email Sync Helper', () => {
  it('calculates correct delay when current time is before target hour on the same day', () => {
    // 02:00 -> target 04:00 (2 hours later)
    const now = new Date('2026-09-15T02:00:00.000Z');
    const targetHour = now.getHours() + 2;
    const ms = getMillisecondsUntilNextHour(targetHour, now);
    assert.strictEqual(ms, 2 * 60 * 60 * 1000);
  });

  it('calculates correct delay when current time is after target hour (rolls over to next day)', () => {
    // 05:00 -> target 04:00 (23 hours later)
    const now = new Date('2026-09-15T05:00:00.000Z');
    const targetHour = now.getHours() - 1;
    const ms = getMillisecondsUntilNextHour(targetHour, now);
    assert.strictEqual(ms, 23 * 60 * 60 * 1000);
  });

  it('calculates full 24 hours delay when current time is equal to or past target time today', () => {
    const now = new Date('2026-09-15T04:00:00.000Z');
    const ms = getMillisecondsUntilNextHour(now.getHours(), now);
    // If it's exactly 04:00:00.000, next run is 24 hours later
    assert.strictEqual(ms, 24 * 60 * 60 * 1000);
  });

  it('handles executeDailyEmailSync gracefully when password is not set', async () => {
    const originalPass = process.env.GHB_EMAIL_APP_PASSWORD;
    delete process.env.GHB_EMAIL_APP_PASSWORD;

    try {
      const res = await executeDailyEmailSync();
      assert.strictEqual(res.added, 0);
      assert.ok(Array.isArray(res.errors));
    } finally {
      if (originalPass) {
        process.env.GHB_EMAIL_APP_PASSWORD = originalPass;
      }
    }
  });

  it('does not throw when startDailyEmailSyncScheduler is called with disabled env', () => {
    const originalEnabled = process.env.ENABLE_DAILY_EMAIL_SYNC;
    process.env.ENABLE_DAILY_EMAIL_SYNC = 'false';

    try {
      assert.doesNotThrow(() => {
        startDailyEmailSyncScheduler(4);
      });
    } finally {
      if (originalEnabled !== undefined) {
        process.env.ENABLE_DAILY_EMAIL_SYNC = originalEnabled;
      } else {
        delete process.env.ENABLE_DAILY_EMAIL_SYNC;
      }
    }
  });
});
