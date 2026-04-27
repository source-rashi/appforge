"use client";

import { useI18n } from '../lib/i18n-context';

export function LocaleSwitcher() {
  const { locale, setLocale, availableLocales, localeNames } = useI18n();

  if (!availableLocales || availableLocales.length <= 1) {
    return null;
  }

  return (
    <div className="relative inline-block text-left">
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
        className="block w-full pl-3 pr-8 py-1.5 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md bg-gray-50 text-gray-700 font-medium"
      >
        {availableLocales.map((loc) => (
          <option key={loc} value={loc}>
            {localeNames[loc] || loc}
          </option>
        ))}
      </select>
    </div>
  );
}
