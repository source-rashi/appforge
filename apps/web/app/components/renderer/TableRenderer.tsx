"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTable } from '../../lib/config-context';
import { apiGet } from '../../lib/api-client';
import type { TableComponentConfig } from '@appforge/config-types';
import { useI18n } from '../../lib/i18n-context';

export function TableRenderer({ config, appId }: { config: TableComponentConfig; appId: string }) {
  const tableConfig = useTable(config.table);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { t } = useI18n();

  const pageSize = config.pageSize || 20;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tableData', appId, config.table, page, search, sortBy, sortOrder],
    queryFn: () => apiGet<{ data: any[], meta: any }>(`/apps/${appId}/${config.table}`, {
      page,
      pageSize,
      search: search || undefined,
      sortBy,
      sortOrder
    }),
  });

  if (!tableConfig) {
    return <div className="text-red-500">Table config not found for {config.table}</div>;
  }

  const columns = config.columns && config.columns.length > 0 
    ? tableConfig.fields.filter(f => config.columns!.includes(f.name))
    : tableConfig.fields;

  const handleSort = (field: string) => {
    if (!config.sortable) return;
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      {config.searchable && (
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder={t('search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm border border-gray-300 rounded-md p-2"
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(col => (
                <th
                  key={col.name}
                  onClick={() => handleSort(col.name)}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${config.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                >
                  {col.name.replace(/_/g, ' ')}
                  {sortBy === col.name && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              // Skeleton loading
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map(c => (
                    <td key={c.name} className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : isError ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-red-500">
                  <p>{t('error')}: {(error as any)?.message}</p>
                  <button onClick={() => refetch()} className="mt-2 text-blue-600 hover:underline">Retry</button>
                </td>
              </tr>
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                  {t('no_data')}
                </td>
              </tr>
            ) : (
              data?.data.map((row: any) => (
                <tr key={row.id || JSON.stringify(row)} className="hover:bg-gray-50 cursor-pointer">
                  {columns.map(col => (
                    <td key={col.name} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {String(row[col.name] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {config.paginated && data?.meta && (
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-700">
            Page {data.meta.page} of {data.meta.totalPages || 1} (Total: {data.meta.total})
          </span>
          <div className="space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= (data.meta.totalPages || 1)}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
