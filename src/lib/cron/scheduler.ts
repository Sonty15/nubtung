import { executeFullSync } from '@/lib/sync/runner';

let syncIntervalTimer: NodeJS.Timeout | null = null;
let isSyncRunning = false;

export function startBackgroundSyncScheduler() {
  const enabled = process.env.ENABLE_BACKGROUND_SYNC !== 'false';
  if (!enabled) {
    console.log('[Scheduler] Background auto-sync is disabled via ENABLE_BACKGROUND_SYNC=false');
    return;
  }

  const intervalMinutes = parseInt(process.env.AUTO_SYNC_INTERVAL_MINUTES || '60', 10);
  const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;

  console.log(`[Scheduler] 🚀 Initializing Background Auto-Sync every ${intervalMinutes} minutes (default: 60 mins)...`);

  // Clear existing timer if any
  if (syncIntervalTimer) {
    clearInterval(syncIntervalTimer);
  }

  // Periodic background execution
  syncIntervalTimer = setInterval(async () => {
    if (isSyncRunning) {
      console.log('[Scheduler] Previous sync is still running, skipping tick...');
      return;
    }

    isSyncRunning = true;
    try {
      await executeFullSync();
    } catch (err: any) {
      console.error('[Scheduler] Error during scheduled sync:', err.message);
    } finally {
      isSyncRunning = false;
    }
  }, intervalMs);

  // Initial sync after 15 seconds on startup
  setTimeout(async () => {
    if (isSyncRunning) return;
    isSyncRunning = true;
    try {
      console.log('[Scheduler] Running initial startup sync check...');
      await executeFullSync();
    } catch (err: any) {
      console.error('[Scheduler] Error during startup sync:', err.message);
    } finally {
      isSyncRunning = false;
    }
  }, 15000);
}
