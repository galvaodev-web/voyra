"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { initialData } from "@/data/mock-data";
import type { AppData, Trip } from "@/types";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  loadRemote,
  saveRemotePreferences,
  saveRemoteTrip,
  deleteRemoteTrip,
} from "@/lib/repository";
type Store = {
  data: AppData;
  ready: boolean;
  error: string | null;
  saveTrip: (trip: Trip) => Promise<boolean>;
  deleteTrip: (trip: Trip) => Promise<boolean>;
  toggleFavorite: (id: string) => Promise<void>;
  savePreferences: (patch: Partial<AppData>) => Promise<boolean>;
  reload: () => void;
};
const Context = createContext<Store | null>(null);
const key = "voyra-demo-v1";
export function VoyraProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(initialData);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    async function init() {
      try {
        let next = initialData;
        if (isSupabaseConfigured) next = await loadRemote();
        else if (!isSupabaseConfigured) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored) as AppData;
            if (!Array.isArray(parsed.trips) || !Array.isArray(parsed.favorites) || !parsed.profile)
              throw new Error(
                "Dados locais inválidos. Limpe os dados do site para reiniciar a demonstração.",
              );
            next = parsed;
          }
        }
        if (active) {
          setData(next);
          setError(null);
        }
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : "Não foi possível carregar seus dados.");
      } finally {
        if (active) setReady(true);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [revision]);
  async function persist(next: AppData, trip?: Trip) {
    try {
      if (isSupabaseConfigured) {
        if (trip) {
          const saved = await saveRemoteTrip(trip);
          next = { ...next, trips: next.trips.map((t) => (t.id === saved.id ? saved : t)) };
        } else await saveRemotePreferences(next);
      } else localStorage.setItem(key, JSON.stringify(next));
      setData((current) => {
        if (!isSupabaseConfigured) return next;
        if (!trip)
          return {
            ...current,
            profile: next.profile,
            favorites: next.favorites,
            savedRoutes: next.savedRoutes,
          };
        const saved = next.trips.find((t) => t.id === trip.id)!;
        return {
          ...current,
          trips: current.trips.some((t) => t.id === saved.id)
            ? current.trips.map((t) => (t.id === saved.id ? saved : t))
            : [saved, ...current.trips],
        };
      });
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar. Tente novamente.");
      return false;
    }
  }
  async function saveTrip(trip: Trip) {
    return persist(
      {
        ...data,
        trips: data.trips.some((t) => t.id === trip.id)
          ? data.trips.map((t) => (t.id === trip.id ? trip : t))
          : [trip, ...data.trips],
      },
      trip,
    );
  }
  async function savePreferences(patch: Partial<AppData>) {
    return persist({ ...data, ...patch });
  }
  async function deleteTrip(trip: Trip) {
    try {
      const next = { ...data, trips: data.trips.filter((t) => t.id !== trip.id) };
      if (isSupabaseConfigured) await deleteRemoteTrip(trip);
      else localStorage.setItem(key, JSON.stringify(next));
      setData((current) => ({ ...current, trips: current.trips.filter((t) => t.id !== trip.id) }));
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir a viagem.");
      return false;
    }
  }
  async function toggleFavorite(id: string) {
    const removing = data.favorites.includes(id);
    if (
      await savePreferences({
        favorites: removing ? data.favorites.filter((f) => f !== id) : [...data.favorites, id],
      })
    )
      toast.success(removing ? "Destino removido dos favoritos" : "Destino salvo nos favoritos");
  }
  return (
    <Context.Provider
      value={{
        data,
        ready,
        error,
        saveTrip,
        deleteTrip,
        toggleFavorite,
        savePreferences,
        reload: () => setRevision((v) => v + 1),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useVoyra = () => {
  const context = useContext(Context);
  if (!context) throw new Error("VoyraProvider não encontrado");
  return context;
};
