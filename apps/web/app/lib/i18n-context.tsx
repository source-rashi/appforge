"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { AppConfigContext } from './config-context';

export type I18nContextValue = {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string, vars?: Record<string, string>) => string;
  availableLocales: string[];
  localeNames: Record<string, string>;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const BUILT_IN_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    submit: "Submit",
    cancel: "Cancel",
    loading: "Loading...",
    error: "Something went wrong",
    no_data: "No data found",
    search: "Search...",
    import_csv: "Import CSV",
    drag_drop: "Drag and drop a CSV file here",
    login: "Log in",
    register: "Create account",
    logout: "Log out",
    notifications: "Notifications",
    mark_read: "Mark all as read"
  },
  es: {
    submit: "Enviar",
    cancel: "Cancelar",
    loading: "Cargando...",
    error: "Algo salió mal",
    no_data: "Sin datos",
    search: "Buscar...",
    import_csv: "Importar CSV",
    drag_drop: "Arrastra un archivo CSV aquí",
    login: "Iniciar sesión",
    register: "Crear cuenta",
    logout: "Cerrar sesión",
    notifications: "Notificaciones",
    mark_read: "Marcar todo como leído"
  },
  fr: {
    submit: "Soumettre",
    cancel: "Annuler",
    loading: "Chargement...",
    error: "Une erreur s'est produite",
    no_data: "Aucune donnée",
    search: "Rechercher...",
    import_csv: "Importer CSV",
    drag_drop: "Glissez un fichier CSV ici",
    login: "Se connecter",
    register: "Créer un compte",
    logout: "Se déconnecter",
    notifications: "Notifications",
    mark_read: "Tout marquer comme lu"
  }
};

const DEFAULT_LOCALE_NAMES: Record<string, string> = {
  en: "English",
  es: "Español",
  fr: "Français"
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState('en');
  
  // Attempt to read config if available (might be null if outside AppConfigProvider)
  const appConfigCtx = useContext(AppConfigContext);
  const config = appConfigCtx?.config;

  const i18nConfig = config?.i18n;

  useEffect(() => {
    const saved = localStorage.getItem('appforge_locale');
    if (saved) {
      setLocaleState(saved);
    } else if (i18nConfig?.defaultLocale) {
      setLocaleState(i18nConfig.defaultLocale);
    }
  }, [i18nConfig]);

  const setLocale = (newLocale: string) => {
    setLocaleState(newLocale);
    localStorage.setItem('appforge_locale', newLocale);
  };

  const t = (key: string, vars?: Record<string, string>) => {
    const configTranslations = i18nConfig?.translations || {};
    
    // 1. Try configured translations for current locale
    let text = configTranslations[locale]?.[key];
    
    // 2. Try built-in translations for current locale
    if (text === undefined) {
      text = BUILT_IN_TRANSLATIONS[locale]?.[key];
    }
    
    // 3. Try configured translations for default locale
    if (text === undefined && i18nConfig?.defaultLocale) {
      text = configTranslations[i18nConfig.defaultLocale]?.[key];
    }
    
    // 4. Try built-in translations for EN (universal fallback)
    if (text === undefined) {
      text = BUILT_IN_TRANSLATIONS['en']?.[key];
    }

    // 5. Fallback to key itself
    if (text === undefined) {
      text = key;
    }

    if (vars && text) {
      Object.keys(vars).forEach(varKey => {
        text = text.replace(new RegExp(`{{${varKey}}}`, 'g'), vars[varKey]);
      });
    }

    return text;
  };

  const availableLocales = i18nConfig?.locales || Object.keys(BUILT_IN_TRANSLATIONS);
  
  const localeNames = useMemo(() => {
    return availableLocales.reduce((acc, loc) => {
      acc[loc] = DEFAULT_LOCALE_NAMES[loc] || loc.toUpperCase();
      return acc;
    }, {} as Record<string, string>);
  }, [availableLocales]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, availableLocales, localeNames }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
