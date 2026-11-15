import { createContext } from 'react';
import type en from './locales/en';

export type Language = 'en' | 'hi' | 'kn' | 'ta';
export type TranslationKey = keyof typeof en;
type TranslationParams = Record<string, string | number>;

export interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  plural: (key: TranslationKey, count: number, params?: TranslationParams) => string;
}

export const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);
