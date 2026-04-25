"use client";

import { useCallback, useEffect, useState } from "react";
import { Session, SonoraUser, getCurrentUser } from "./api";

const STORAGE_KEY = "sonora.session";

export function useSession(): {
  session: Session | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  refreshMe: () => Promise<void>;
} {
  const [session, setSessionState] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const persist = useCallback((next: Session | null) => {
    setSessionState(next);
    if (typeof window === "undefined") return;
    if (next) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const refreshMe = useCallback(async () => {
    if (!session) return;
    try {
      const user: SonoraUser = await getCurrentUser(session.access_token);
      persist({ ...session, user });
    } catch {
      persist(null);
    }
  }, [session, persist]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Session;
        if (parsed?.access_token && parsed.user) {
          setSessionState(parsed);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  return { session, loading, setSession: persist, refreshMe };
}
