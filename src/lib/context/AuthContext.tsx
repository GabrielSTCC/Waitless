"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import {
  isTwoFactorPending,
  TWO_FACTOR_PENDING_EVENT,
} from "@/lib/auth/two-factor-client";
import { fetchSessionViaApi } from "@/lib/auth/session-client";
import { fetchMember, subscribeAuth } from "@/lib/firebase/auth";
import { initFirebaseAppCheck } from "@/lib/firebase/app-check";
import { setFirestoreClientReadySignal } from "@/lib/firebase/firestore-ready-signal";
import { waitForFirestoreClient } from "@/lib/firebase/firestore-client-ready";
import { auth } from "@/lib/firebase/config";
import { getCompany } from "@/lib/firebase/firestore";
import type { Company, Member } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  member: Member | null;
  company: Company | null;
  loading: boolean;
  firestoreClientReady: boolean;
  twoFactorPending: boolean;
  refreshSession: () => Promise<void>;
  hydrateSession: (member: Member, company?: Company | null) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  member: null,
  company: null,
  loading: true,
  firestoreClientReady: false,
  twoFactorPending: false,
  refreshSession: async () => {},
  hydrateSession: () => {},
});

function isPermissionError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code === "permission-denied") return true;
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Missing or insufficient permissions") ||
    message.includes("permission-denied")
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [firestoreClientReady, setFirestoreClientReady] = useState(false);
  const [twoFactorPending, setTwoFactorPending] = useState(false);
  const memberRef = useRef<Member | null>(null);
  const companyRef = useRef<Company | null>(null);

  const applySession = useCallback((nextMember: Member | null, nextCompany: Company | null) => {
    memberRef.current = nextMember;
    companyRef.current = nextCompany;
    setMember(nextMember);
    setCompany(nextCompany);
  }, []);

  const syncFirestoreClientReady = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setFirestoreClientReady(false);
      setFirestoreClientReadySignal(false);
      return;
    }

    try {
      const ready = await waitForFirestoreClient();
      setFirestoreClientReady(ready);
      setFirestoreClientReadySignal(ready);
    } catch (error) {
      console.warn("[AuthContext] Firestore client não ficou pronto:", error);
      setFirestoreClientReady(false);
      setFirestoreClientReadySignal(false);
    }
  }, []);

  const loadSession = useCallback(
    async (nextUser: User | null) => {
      if (!nextUser) {
        applySession(null, null);
        setFirestoreClientReady(false);
        setFirestoreClientReadySignal(false);
        return;
      }

      try {
        const session = await fetchSessionViaApi();
        applySession(session.member, session.company);
      } catch (apiError) {
        console.warn("[AuthContext] Sessão via API indisponível, tentando Firestore:", apiError);

        try {
          const memberData = await fetchMember(nextUser.uid);
          if (memberData) {
            applySession(memberData, companyRef.current);
            try {
              const companyData = await getCompany(memberData.companyId);
              applySession(memberData, companyData);
            } catch (error) {
              console.error("[AuthContext] Falha ao carregar estabelecimento:", error);
            }
          } else {
            applySession(null, null);
          }
        } catch (error) {
          console.error("[AuthContext] Falha ao carregar sessão:", error);
          if (isPermissionError(error) && memberRef.current) {
            void syncFirestoreClientReady(nextUser);
            return;
          }
          applySession(null, null);
        }
      }

      void syncFirestoreClientReady(nextUser);
    },
    [applySession, syncFirestoreClientReady],
  );

  const hydrateSession = useCallback(
    (memberData: Member, companyData?: Company | null) => {
      applySession(memberData, companyData ?? null);
      if (companyData) {
        void syncFirestoreClientReady(auth.currentUser);
        return;
      }

      void fetchSessionViaApi()
        .then((session) => {
          if (session.company) {
            applySession(memberData, session.company);
          }
        })
        .catch((error) => {
          console.error("[AuthContext] Falha ao carregar estabelecimento em background:", error);
        })
        .finally(() => {
          void syncFirestoreClientReady(auth.currentUser);
        });
    },
    [applySession, syncFirestoreClientReady],
  );

  const refreshSession = useCallback(async () => {
    const currentUser = auth.currentUser;
    setUser(currentUser);
    setLoading(true);
    try {
      await loadSession(currentUser);
    } finally {
      setLoading(false);
    }
  }, [loadSession]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void initFirebaseAppCheck()
      .catch(() => {
        // Token failure is logged in app-check.ts; auth can still proceed for diagnosis.
      })
      .finally(() => {
        if (cancelled) return;
        unsubscribe = subscribeAuth(async (nextUser) => {
          setUser(nextUser);
          setLoading(true);
          try {
            await loadSession(nextUser);
          } finally {
            setLoading(false);
          }
        });
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [loadSession]);

  useEffect(() => {
    function syncTwoFactorPending() {
      if (!user) {
        setTwoFactorPending(false);
        return;
      }
      setTwoFactorPending(
        isTwoFactorPending(user.uid) ||
          member?.security?.twoFactorPending === true,
      );
    }

    syncTwoFactorPending();
    window.addEventListener(TWO_FACTOR_PENDING_EVENT, syncTwoFactorPending);
    return () => {
      window.removeEventListener(TWO_FACTOR_PENDING_EVENT, syncTwoFactorPending);
    };
  }, [user, member]);

  const value = useMemo(
    () => ({
      user,
      member,
      company,
      loading,
      firestoreClientReady,
      twoFactorPending,
      refreshSession,
      hydrateSession,
    }),
    [
      user,
      member,
      company,
      loading,
      firestoreClientReady,
      twoFactorPending,
      refreshSession,
      hydrateSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
