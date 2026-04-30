import React from 'react';
import type { ComponentConfig } from '@appforge/config-types';
import { FormRenderer } from './FormRenderer';
import { TableRenderer } from './TableRenderer';
import { DashboardRenderer } from './DashboardRenderer';
import { CsvImportRenderer } from './CsvImportRenderer';
import { StatsRenderer } from './StatsRenderer';

export function ComponentRenderer({ component, appId }: { component: any; appId: string }) {
  switch (component.type) {
    case 'form':
      return <FormRenderer config={component} appId={appId} />;
    case 'table':
    case 'data-table': {
      // Normalize 'data-table' props to 'table' config
      const tableConfig = component.type === 'data-table' 
        ? { ...component, table: component.props?.source?.replace('/','') || component.table }
        : component;
      return <TableRenderer config={tableConfig} appId={appId} />;
    }
    case 'stats':
      return <StatsRenderer config={component} />;
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
