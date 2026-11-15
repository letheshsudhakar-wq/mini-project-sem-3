import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../i18n';

interface LanguageSelectorProps {
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <label className={`inline-flex items-center gap-2 text-sm text-slate-600 ${className}`}>
      <Languages className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">{t('language.label')}</span>
      <select
        value={language}
        onChange={(event) => {
          const value = event.target.value;
          if (value === 'en' || value === 'hi' || value === 'kn' || value === 'ta') setLanguage(value);
        }}
        aria-label={t('language.label')}
        className="min-w-24 bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
      >
        <option value="en">English</option>
        <option value="hi">हिन्दी</option>
        <option value="kn">ಕನ್ನಡ</option>
        <option value="ta">தமிழ்</option>
      </select>
    </label>
  );
};
