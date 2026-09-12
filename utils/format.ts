import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const money = (value: number, currency = "BRL") =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    value,
  );
export const dateLabel = (value: string) =>
  new Date(value + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
export const tripDays = (start: string, end: string) =>
  Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1);
export const uid = () => crypto.randomUUID();
export const safeNext = (value: string | null) =>
  value && /^\/app(?:\/|\?|$)/.test(value) && !/[\\\r\n]/.test(value) ? value : "/app/dashboard";
export const expenseBRL = (amount: number, currency: string) =>
  amount * ({ BRL: 1, EUR: 6, USD: 5.2 }[currency] ?? 1);
