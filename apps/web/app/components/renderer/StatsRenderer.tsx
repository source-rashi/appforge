"use client";

import React from 'react';

interface StatItem {
  label: string;
  value: string | number;
  color?: string;
}

interface StatsRendererProps {
  config: {
    props?: {
      items?: StatItem[];
    };
    items?: StatItem[];
  };
}

export function StatsRenderer({ config }: StatsRendererProps) {
  const items = config.props?.items || config.items || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {items.map((item, idx) => (
        <div key={idx} className="glass-panel p-6 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all duration-300">
          <p className="text-zinc-400 text-sm font-medium mb-1">{item.label}</p>
          <p className={`text-3xl font-bold ${item.color === 'green' ? 'text-emerald-400' : item.color === 'blue' ? 'text-blue-400' : 'text-indigo-400'}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
