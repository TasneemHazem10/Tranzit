import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { I18nManager } from 'react-native';
import { translations, type Language, type TranslationKeys } from '../i18n/translations';
import { getItem, setItem } from './storage';

const LANG_KEY = 'tranzet_language';

type LanguageContextValue = {
  language: Language;
  isRTL: boolean;
  t: TranslationKeys;
  setLanguage: (lang: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: 'ar',
  isRTL: true,
  t: translations.ar,
  setLanguage: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ar');

  useEffect(() => {
    (async () => {
      try {
        const stored = await getItem(LANG_KEY);
        if (stored === 'ar' || stored === 'en') {
          setLanguageState(stored);
          I18nManager.forceRTL(stored === 'ar');
          I18nManager.allowRTL(true);
        }
      } catch {}
    })();
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    await setItem(LANG_KEY, lang);
    setLanguageState(lang);
    I18nManager.forceRTL(lang === 'ar');
  }, []);

  const value = useMemo(
    () => ({
      language,
      isRTL: language === 'ar',
      t: translations[language],
      setLanguage,
    }),
    [language, setLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
