import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  clearSession,
  fetchMe,
  loadSession,
  login as apiLogin,
  register as apiRegister,
  saveSession,
  updateMe as apiUpdateMe,
} from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadSession());
  const [booting, setBooting] = useState(Boolean(loadSession()?.token));
  const [authOpen, setAuthOpen] = useState(false);
  const [authIntent, setAuthIntent] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      if (!session?.token) {
        setBooting(false);
        return;
      }
      try {
        const user = await fetchMe(session.token);
        if (!cancelled) {
          const next = { token: session.token, user };
          setSession(next);
          saveSession(next);
        }
      } catch {
        if (!cancelled) {
          clearSession();
          setSession(null);
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    }
    refresh();
    return () => {
      cancelled = true;
    };
    // solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applySession = useCallback((data) => {
    const next = { token: data.token, user: data.user };
    saveSession(next);
    setSession(next);
    return next;
  }, []);

  const register = useCallback(
    async (input) => applySession(await apiRegister(input)),
    [applySession],
  );

  const login = useCallback(
    async (input) => applySession(await apiLogin(input)),
    [applySession],
  );

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const updateProfile = useCallback(
    async (input) => {
      if (!session?.token) throw new Error('Sin sesión');
      const user = await apiUpdateMe(session.token, input);
      const next = { token: session.token, user };
      saveSession(next);
      setSession(next);
      return user;
    },
    [session],
  );

  const requireAuth = useCallback((intent) => {
    if (session?.token) return true;
    setAuthIntent(intent || null);
    setAuthOpen(true);
    return false;
  }, [session]);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      booting,
      login,
      register,
      logout,
      updateProfile,
      requireAuth,
      authOpen,
      setAuthOpen,
      authIntent,
      setAuthIntent,
    }),
    [
      session,
      booting,
      login,
      register,
      logout,
      updateProfile,
      requireAuth,
      authOpen,
      authIntent,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
}
