/**
 * Screen Wake Lock manager
 * Prevents the screen from turning off during audio playback on mobile devices
 */

let wakeLock: WakeLockSentinel | null = null;

/**
 * Request a wake lock to prevent screen from sleeping
 */
export async function requestWakeLock(): Promise<void> {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
    } catch (err) {
      const error = err as Error;
      console.log('Wake Lock error:', error.name, error.message);
    }
  }
}

/**
 * Release the wake lock
 */
export async function releaseWakeLock(): Promise<void> {
  if (wakeLock) {
    await wakeLock.release();
    wakeLock = null;
  }
}

/**
 * Check if wake lock is currently held
 */
export function hasWakeLock(): boolean {
  return wakeLock !== null;
}
