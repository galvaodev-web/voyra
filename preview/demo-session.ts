const key = "voyra-pages-session";
export function hasDemoSession() {
  return Number(localStorage.getItem(key) ?? 0) > Date.now();
}
export async function startDemoSession() {
  localStorage.setItem(key, String(Date.now() + 86400000));
}
export async function endDemoSession() {
  localStorage.removeItem(key);
}
