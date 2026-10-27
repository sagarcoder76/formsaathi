// Registers the app's service worker on load for offline support and Web Push.
// Failures are silent: unsupported/blocked environments keep working as a normal website.
export function registerPWA(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}
