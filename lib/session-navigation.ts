export function navigateWithFreshSession(path: string) {
  // A full navigation discards private React state after authentication changes.
  window.location.assign(new URL(path, window.location.origin).href);
}
export function getNavigationSearch() {
  return new URLSearchParams(window.location.search);
}
