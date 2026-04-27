"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AppConfig, TableConfig, PageConfig } from '@appforge/config-types';
import { apiGet } from './api-client';

interface AppConfigContextValue {
  config: AppConfig | null;
  setConfig: (config: AppConfig | null) => void;
  loading: boolean;
  error: Error | null;
}

export const AppConfigContext = createContext<AppConfigContextValue | undefined>(undefined);

export function AppConfigProvider({ children, appId }: { children: React.ReactNode; appId: string }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoading(true);
        // Assuming the endpoint returns { config: AppConfig }
        const data = await apiGet<{ config: AppConfig }>(`/apps/${appId}/config`);
        setConfig(data.config);
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    if (appId) {
      fetchConfig();
    }
  }, [appId]);

  return (
    <AppConfigContext.Provider value={{ config, setConfig, loading, error }}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  const context = useContext(AppConfigContext);
  if (context === undefined) {
    throw new Error('useAppConfig must be used within an AppConfigProvider');
  }
  return context;
}

export function useTable(tableName: string): TableConfig | undefined {
  const { config } = useAppConfig();
  return config?.database.tables.find((t) => t.name === tableName);
}

export function usePage(pageId: string): PageConfig | undefined {
  const { config } = useAppConfig();
  return config?.pages.find((p) => p.id === pageId);
}
