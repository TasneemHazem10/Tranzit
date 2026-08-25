import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { authApi, type User } from '../api/endpoints';

const TOKEN_KEY = 'tranzit_token';
const ONBOARDING_KEY = 'tranzit_seen_onboarding';

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  seenOnboarding: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  markOnboardingSeen: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  loading: true,
  seenOnboarding: false,
  signIn: async () => {},
  signOut: async () => {},
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
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(ONBOARDING_KEY),
        ]);

        if (storedSeen === '1') setSeenOnboarding(true);

        if (storedToken) {
          const { user: me } = await authApi.me(storedToken);
          setToken(storedToken);
          setUser(me);
        }
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (newToken: string, newUser: User) => {
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const signOut = useCallback(async () => {
    if (token) {
      await authApi.logout(token).catch(() => {});
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    setToken(null);
    setUser(null);
  }, [token]);

  const markOnboardingSeen = useCallback(async () => {
    await SecureStore.setItemAsync(ONBOARDING_KEY, '1');
    setSeenOnboarding(true);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, seenOnboarding, signIn, signOut, markOnboardingSeen }),
    [user, token, loading, seenOnboarding, signIn, signOut, markOnboardingSeen]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
