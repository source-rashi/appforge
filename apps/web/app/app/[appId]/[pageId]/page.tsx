"use client";

import { usePage, useAppConfig } from '../../../lib/config-context';
import { ComponentRenderer } from '../../../components/renderer/ComponentRenderer';

import { use } from 'react';

export default function DynamicPage({ params }: { params: Promise<{ appId: string, pageId: string }> }) {
  const { appId, pageId } = use(params);
  const { loading, error } = useAppConfig();
  const pageConfig = usePage(pageId);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded shadow">
        Failed to load app configuration: {error.message}
      </div>
    );
  }

  if (!pageConfig) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Page Not Found</h2>
        <p className="text-gray-500">The page '{pageId}' does not exist in this application's configuration.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <h1 className="text-3xl font-bold text-gray-900 border-b pb-4">{pageConfig.title}</h1>
      
      <div className="grid gap-8">
        {pageConfig.components.map((component, idx) => (
          <div key={idx} className="w-full">
             <ComponentRenderer component={component} appId={appId} />
          </div>
        ))}
      </div>
    </div>
  );
}
