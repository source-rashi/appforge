import React from 'react';
import type { ComponentConfig } from '@appforge/config-types';
import { FormRenderer } from './FormRenderer';
import { TableRenderer } from './TableRenderer';
import { DashboardRenderer } from './DashboardRenderer';
import { CsvImportRenderer } from './CsvImportRenderer';
import { UnknownComponentFallback } from './UnknownComponentFallback';

export function ComponentRenderer({ component, appId }: { component: ComponentConfig; appId: string }) {
  switch (component.type) {
    case 'form':
      return <FormRenderer config={component} appId={appId} />;
    case 'table':
      return <TableRenderer config={component} appId={appId} />;
    case 'dashboard':
      return <DashboardRenderer config={component} appId={appId} />;
    case 'csv_import':
      return <CsvImportRenderer config={component} appId={appId} />;
    case 'unknown':
      return <UnknownComponentFallback raw={component.raw} />;
    default:
      return <UnknownComponentFallback raw={component} />;
  }
}
