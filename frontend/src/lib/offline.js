const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}

export async function cacheRouteOffline(routeId, checkpoints) {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return false;

  const urls = [
    `${BACKEND_URL}/api/routes/${routeId}`,
    `${BACKEND_URL}/api/routes/${routeId}/checkpoints`,
    `${BACKEND_URL}/api/map/schematic`,
  ];

  // Add checkpoint images (skip video if too large)
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
    navigator.serviceWorker.controller.postMessage({ type: 'CACHE_ROUTE', routeId, urls });
    // Timeout after 30s
    setTimeout(() => { resolve(false); }, 30000);
  });
}

export function isServiceWorkerActive() {
  return 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;
}
