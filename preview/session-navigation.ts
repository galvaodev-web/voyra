import { navigate, routeSnapshot } from "./navigation";
export function navigateWithFreshSession(path: string) {
  navigate(path);
  window.location.reload();
}
export function getNavigationSearch() {
  const route = routeSnapshot();
  return new URLSearchParams(route.includes("?") ? route.slice(route.indexOf("?") + 1) : "");
}
