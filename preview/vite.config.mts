import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/postcss";
const file = (path: string) => fileURLToPath(new URL(path, import.meta.url));
export default defineConfig({
  root: file("./"),
  base: "/voyra/",
  envDir: false,
  publicDir: false,
  css: { postcss: { plugins: [tailwindcss()] } },
  resolve: {
    alias: [
      { find: "@/lib/demo-session", replacement: file("./demo-session.ts") },
      { find: "@/lib/session-navigation", replacement: file("./session-navigation.ts") },
      { find: "next/link", replacement: file("./link.tsx") },
      { find: "next/image", replacement: file("./image.tsx") },
      { find: "next/navigation", replacement: file("./navigation.ts") },
      { find: "@", replacement: file("../") },
    ],
  },
  define: {
    "process.env.NEXT_PUBLIC_BILLING_ENABLED": '"false"',
    "process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED": '"false"',
    "process.env.NEXT_PUBLIC_BOOKING_AFFILIATE_URL": '""',
    "process.env.NEXT_PUBLIC_SUPABASE_URL": '""',
    "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": '""',
    "process.env.NEXT_PUBLIC_DEMO_ENABLED": '"true"',
    "process.env.NEXT_PUBLIC_STATIC_DEMO": '"true"',
    "process.env.NEXT_PUBLIC_TERMS_URL": '""',
    "process.env.NEXT_PUBLIC_PRIVACY_URL": '""',
    "process.env.NEXT_PUBLIC_SUPPORT_EMAIL": '""',
  },
  build: { outDir: file("../pages-dist"), emptyOutDir: true },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
});
