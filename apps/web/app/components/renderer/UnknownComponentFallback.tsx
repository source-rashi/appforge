import React from 'react';

export function UnknownComponentFallback({ raw }: { raw: unknown }) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-md my-4">
      <h3 className="font-bold mb-2">Unknown Component Type</h3>
      <p className="text-sm mb-2">The renderer encountered an unknown component configuration.</p>
      <pre className="bg-yellow-100 p-2 rounded text-xs overflow-auto">
        {JSON.stringify(raw, null, 2)}
      </pre>
    </div>
  );
}
