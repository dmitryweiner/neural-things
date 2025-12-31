/**
 * Page visibility utilities
 * Handles browser tab visibility changes for background audio
 */

export type VisibilityCallback = (visible: boolean) => void;

const callbacks: Set<VisibilityCallback> = new Set();

/**
 * Check if the page is currently visible
 */
export function isPageVisible(): boolean {
  return document.visibilityState === 'visible';
}

/**
 * Subscribe to visibility changes
 * @returns Unsubscribe function
 */
export function onVisibilityChange(callback: VisibilityCallback): () => void {
  callbacks.add(callback);
  return () => callbacks.delete(callback);
}

// Initialize visibility listener
document.addEventListener('visibilitychange', () => {
  const visible = isPageVisible();
  callbacks.forEach((cb) => cb(visible));
});
