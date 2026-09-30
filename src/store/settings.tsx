import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  darkColors,
  lightColors,
  ThemeContext,
} from '../theme';
import { getItem, setItem } from './storage';

const DARK_KEY = 'tranzet_dark_mode';
const NOTIFICATIONS_KEY = 'tranzet_notifications';

type SettingsContextValue = {
  dark: boolean;
  notifications: boolean;
  toggleDark: () => void;
  setDark: (value: boolean) => void;
  toggleNotifications: () => void;
  setNotifications: (value: boolean) => void;
};

const SettingsContext = createContext<SettingsContextValue>({
  dark: false,
  notifications: true,
  toggleDark: () => {},
  setDark: () => {},
  toggleNotifications: () => {},
  setNotifications: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDarkState] = useState(false);
  const [notifications, setNotificationsState] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [storedDark, storedNotif] = await Promise.all([
          getItem(DARK_KEY),
          getItem(NOTIFICATIONS_KEY),
        ]);
        if (storedDark === '1') setDarkState(true);
        if (storedNotif === '0') setNotificationsState(false);
      } catch {}
    })();
  }, []);

  const setDark = useCallback(async (value: boolean) => {
    await setItem(DARK_KEY, value ? '1' : '0').catch(() => {});
    setDarkState(value);
  }, []);

  const toggleDark = useCallback(() => {
    setDarkState(prev => {
      const next = !prev;
      setItem(DARK_KEY, next ? '1' : '0').catch(() => {});
      return next;
    });
  }, []);

  const setNotifications = useCallback(async (value: boolean) => {
    await setItem(NOTIFICATIONS_KEY, value ? '1' : '0').catch(() => {});
    setNotificationsState(value);
  }, []);

  const toggleNotifications = useCallback(() => {
    setNotificationsState(prev => {
      const next = !prev;
      setItem(NOTIFICATIONS_KEY, next ? '1' : '0').catch(() => {});
      return next;
    });
  }, []);

  const palette = dark ? darkColors : lightColors;

  const value = useMemo(
    () => ({
      dark,
      notifications,
      toggleDark,
      setDark,
      toggleNotifications,
      setNotifications,
    }),
    [dark, notifications, toggleDark, setDark, toggleNotifications, setNotifications]
  );

  return (
    <SettingsContext.Provider value={value}>
      <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}