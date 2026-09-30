import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authApi, type User } from '../api/endpoints';
import { getItem, removeItem, setItem } from './storage';

const TOKEN_KEY = 'tranzet_token';
const ONBOARDING_KEY = 'tranzet_seen_onboarding';

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  seenOnboarding: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (user: User) => void;
  markOnboardingSeen: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  loading: true,
  seenOnboarding: false,
  signIn: async () => {},
  signOut: async () => {},
  updateUser: () => {},
  markOnboardingSeen: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [seenOnboarding, setSeenOnboarding] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedSeen] = await Promise.all([
          getItem(TOKEN_KEY),
          getItem(ONBOARDING_KEY),
        ]);

        if (storedSeen === '1') setSeenOnboarding(true);

        if (storedToken) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            const { user: me } = await authApi.me(storedToken);
            clearTimeout(timeout);
            setToken(storedToken);
            setUser(me);
          } catch {
            await removeItem(TOKEN_KEY).catch(() => {});
          }
        }
      } catch {
        await removeItem(TOKEN_KEY).catch(() => {});
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (newToken: string, newUser: User) => {
    await setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const signOut = useCallback(async () => {
    if (token) {
      await authApi.logout(token).catch(() => {});
    }
    await removeItem(TOKEN_KEY).catch(() => {});
    setToken(null);
    setUser(null);
  }, [token]);

  const updateUser = useCallback((newUser: User) => {
    setUser(newUser);
  }, []);

  const markOnboardingSeen = useCallback(async () => {
    await setItem(ONBOARDING_KEY, '1');
    setSeenOnboarding(true);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, seenOnboarding, signIn, signOut, updateUser, markOnboardingSeen }),
    [user, token, loading, seenOnboarding, signIn, signOut, updateUser, markOnboardingSeen]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
