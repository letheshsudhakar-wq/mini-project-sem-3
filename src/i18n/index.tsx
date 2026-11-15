import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import en from './locales/en';
import hi from './locales/hi';
import kn from './locales/kn';
import ta from './locales/ta';
import { LanguageContext } from './context';
import type { Language, LanguageContextValue, TranslationKey } from './context';

export type { Language, TranslationKey } from './context';

type TranslationParams = Record<string, string | number>;

const LANGUAGE_STORAGE_KEY = 'civicfix_language';
const dictionaries: Record<Language, Record<TranslationKey, string>> = { en, hi, kn, ta };
const localeByLanguage: Record<Language, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
  ta: 'ta-IN',
};

function isLanguage(value: string | null | undefined): value is Language {
  return value === 'en' || value === 'hi' || value === 'kn' || value === 'ta';
}

function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(stored) ? stored : 'en';
  } catch (error) {
    console.error('[CivicFix i18n] Could not read the saved language preference:', error);
    return 'en';
  }
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, isConfigured } = useAuth();
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);
  const syncedUserId = useRef<string | null>(null);

  const persistLanguage = useCallback((nextLanguage: Language) => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    } catch (error) {
      console.error('[CivicFix i18n] Could not save the language preference locally:', error);
    }
  }, []);

  const saveProfileLanguage = useCallback(async (nextLanguage: Language, userId: string) => {
    if (!supabase) {
      console.error('[CivicFix i18n] Cannot sync the language preference because Supabase is not configured.');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: nextLanguage })
        .eq('id', userId);

      if (error) {
        console.error('[CivicFix i18n] Could not sync the language preference to the profile:', error.message);
      }
    } catch (error) {
      console.error('[CivicFix i18n] Could not sync the language preference to the profile:', error);
    }
  }, []);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    persistLanguage(nextLanguage);
    if (isConfigured && user) {
      syncedUserId.current = user.id;
      void saveProfileLanguage(nextLanguage, user.id);
    }
  }, [isConfigured, persistLanguage, saveProfileLanguage, user]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!user || !profile || profile.id !== user.id || syncedUserId.current === user.id) return;
    syncedUserId.current = user.id;

    if (isLanguage(profile.preferred_language)) {
      setLanguageState(profile.preferred_language);
      persistLanguage(profile.preferred_language);
    } else if (isConfigured) {
      void saveProfileLanguage(language, user.id);
    }
  }, [user, profile, language, isConfigured, persistLanguage, saveProfileLanguage]);

  useEffect(() => {
    if (!user) syncedUserId.current = null;
  }, [user]);

  const t = useCallback((key: TranslationKey, params?: TranslationParams) => {
    const template = dictionaries[language][key] ?? en[key];
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      params && name in params ? String(params[name]) : match
    );
  }, [language]);

  const formatDate = useCallback((date: Date | string, options?: Intl.DateTimeFormatOptions) => (
    new Intl.DateTimeFormat(localeByLanguage[language], options).format(
      typeof date === 'string' ? new Date(date) : date
    )
  ), [language]);

  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions) => (
    new Intl.NumberFormat(localeByLanguage[language], options).format(value)
  ), [language]);

  const plural = useCallback((key: TranslationKey, count: number, params?: TranslationParams) => (
    t(
      `${key}.${new Intl.PluralRules(localeByLanguage[language]).select(count)}` as TranslationKey,
      { ...params, count }
    )
  ), [language, t]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, formatDate, formatNumber, plural }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
}

export function getCategoryTranslationKey(category: string): TranslationKey | null {
  const key = `category.${category}` as TranslationKey;
  return key in en ? key : null;
}

export function getCategoryDescriptionTranslationKey(category: string): TranslationKey | null {
  const key = `categoryDescription.${category}` as TranslationKey;
  return key in en ? key : null;
}

export function translateCategory(
  category: string,
  translate: LanguageContextValue['t'],
  fallback: string
): string {
  const key = getCategoryTranslationKey(category);
  return key ? translate(key) : fallback;
}

export function translateCategoryDescription(
  category: string,
  translate: LanguageContextValue['t'],
  fallback: string
): string {
  const key = getCategoryDescriptionTranslationKey(category);
  return key ? translate(key) : fallback;
}
