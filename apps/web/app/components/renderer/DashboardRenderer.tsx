"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../lib/api-client';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { DashboardComponentConfig, WidgetConfig } from '@appforge/config-types';

function Widget({ widget, appId }: { widget: WidgetConfig; appId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['widget', appId, widget.table, widget.type, widget.field, widget.filter],
    queryFn: () => apiGet<{ data: any[], meta: any }>(`/apps/${appId}/${widget.table}`, {
      pageSize: 100, // Fetch up to 100 items for charts for simplicity
      ...widget.filter
    }),
  });

  if (isLoading) {
    return <div className="bg-white p-4 rounded-lg shadow border border-gray-200 h-64 animate-pulse" />;
  }

  if (isError) {
    return <div className="bg-white p-4 rounded-lg shadow border border-gray-200 text-red-500 h-64 flex items-center justify-center">Error loading widget</div>;
  }

  const items = data?.data || [];

  if (widget.type === 'count') {
    return (
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 flex flex-col items-center justify-center h-64">
        <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">{widget.label}</h3>
        <p className="mt-2 text-4xl font-extrabold text-gray-900">{data?.meta?.total || 0}</p>
      </div>
    );
  }

  if (widget.type === 'stat') {
    // Simple sum of a field
    const sum = items.reduce((acc, row) => acc + (Number(row[widget.field || '']) || 0), 0);
    return (
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 flex flex-col items-center justify-center h-64">
        <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">{widget.label}</h3>
        <p className="mt-2 text-4xl font-extrabold text-blue-600">{sum}</p>
      </div>
    );
  }

  if (widget.type === 'chart_bar') {
    return (
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200 h-64 flex flex-col">
        <h3 className="text-gray-700 text-sm font-semibold mb-4">{widget.label}</h3>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={items}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey={widget.field || 'value'} fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (widget.type === 'chart_line') {
    return (
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200 h-64 flex flex-col">
        <h3 className="text-gray-700 text-sm font-semibold mb-4">{widget.label}</h3>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={items}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey={widget.field || 'value'} stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return <div>Unknown widget type</div>;
}

export function DashboardRenderer({ config, appId }: { config: DashboardComponentConfig; appId: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {config.widgets.map((widget, idx) => (
        <Widget key={idx} widget={widget} appId={appId} />
      ))}
    </div>
  );
}
