const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

/**
 * Register the service worker.
 * Uses navigator.serviceWorker.ready to guarantee the SW is active
 * before resolving, so callers can safely postMessage immediately after.
 */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);

  return navigator.serviceWorker
    .register('/sw.js')
    .then(() => navigator.serviceWorker.ready)
    .catch(() => null);
}

/**
 * Returns true once the SW has finished activating.
 * Unlike the old check, this waits for .ready instead of testing .controller
 * which is null on the very first page-load before a hard refresh.
 */
export async function ensureServiceWorkerReady() {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    return !!reg.active;
  } catch {
    return false;
  }
}

export async function cacheRouteOffline(routeId, checkpoints) {
  if (!('serviceWorker' in navigator)) return false;

  const reg = await navigator.serviceWorker.ready;
  const sw = reg.active;
  if (!sw) return false;

  const urls = [
    `${BACKEND_URL}/api/routes/${routeId}`,
    `${BACKEND_URL}/api/routes/${routeId}/checkpoints`,
    `${BACKEND_URL}/api/map/schematic`,
  ];

  // Add checkpoint images (skip video — too large for offline)
  checkpoints.forEach((cp) => {
    if (cp.photo_url) urls.push(cp.photo_url);
    if (cp.arrow_map_url) urls.push(cp.arrow_map_url);
    (cp.recovery_image_urls || []).forEach((url) => urls.push(url));
  });

  return new Promise((resolve) => {
    const handler = (event) => {
      if (event.data?.type === 'ROUTE_CACHED' && event.data.routeId === routeId) {
        navigator.serviceWorker.removeEventListener('message', handler);
        resolve(true);
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    sw.postMessage({ type: 'CACHE_ROUTE', routeId, urls });
    setTimeout(() => resolve(false), 30000);
  });
}
