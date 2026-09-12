import { useSyncExternalStore } from "react";
export function routeSnapshot() {
  const hash = window.location.hash.slice(1);
  return hash.startsWith("/") && !hash.startsWith("//") ? hash : "/";
}
function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
  };
}
export function useRoute() {
  return useSyncExternalStore(subscribe, routeSnapshot, () => "/");
}
export function usePathname() {
  return useRoute().split("?")[0];
}
export function useSearchParams() {
  const route = useRoute();
  return new URLSearchParams(route.includes("?") ? route.slice(route.indexOf("?") + 1) : "");
}
export function routeHref(path: string) {
  return `${import.meta.env.BASE_URL}#${path}`;
}
export function navigate(path: string, replace = false) {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Rota inválida");
  if (replace) {
    window.history.replaceState(null, "", routeHref(path));
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else window.location.hash = path;
  window.scrollTo(0, 0);
}
const router = {
  push: (path: string) => navigate(path),
  replace: (path: string) => navigate(path, true),
  back: () => history.back(),
  forward: () => history.forward(),
  refresh: () => location.reload(),
  prefetch: () => {},
};
export function useRouter() {
  return router;
}
