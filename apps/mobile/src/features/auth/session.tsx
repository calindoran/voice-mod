import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { signIn as requestSignIn, signOut as requestSignOut } from "./api";
import { AuthSession } from "./types";

interface SessionContextValue {
  session: AuthSession | null;
  signIn: (phoneNumber: string, userName: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);

  const signIn = useCallback(async (phoneNumber: string, userName: string) => {
    const nextSession = await requestSignIn(phoneNumber, userName);
    setSession(nextSession);
  }, []);

  const signOut = useCallback(async () => {
    if (!session) return;
    setSession(null);
    await requestSignOut(session.token);
  }, [session]);

  const clearSession = useCallback(() => setSession(null), []);
  const value = useMemo(
    () => ({ session, signIn, signOut, clearSession }),
    [session, signIn, signOut, clearSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}
