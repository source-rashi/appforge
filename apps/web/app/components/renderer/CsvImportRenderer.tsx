"use client";

import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { useTable } from '../../lib/config-context';
import { apiClient, apiGet } from '../../lib/api-client';
import type { CsvImportComponentConfig } from '@appforge/config-types';
import { useI18n } from '../../lib/i18n-context';

export function CsvImportRenderer({ config, appId }: { config: CsvImportComponentConfig; appId: string }) {
  const tableConfig = useTable(config.table);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const { t } = useI18n();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = (f: File) => {
    if (!f.name.endsWith('.csv') && f.type !== 'text/csv') {
      toast.error('Please upload a valid CSV file');
      return;
    }
    setFile(f);
    Papa.parse(f, {
      header: true,
      preview: 1,
      complete: (results) => {
        if (results.meta.fields) {
          setHeaders(results.meta.fields);
          // Auto-map if headers match exactly
          const initialMapping: Record<string, string> = {};
          results.meta.fields.forEach(h => {
            const match = tableConfig?.fields.find(tf => tf.name.toLowerCase() === h.toLowerCase());
            if (match) {
              initialMapping[h] = match.name;
            }
          });
          setMapping(initialMapping);
        }
      }
    });
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fieldMapping', JSON.stringify(mapping));

    try {
      const res = await apiClient.post(`/apps/${appId}/import/${config.table}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setJobId(res.data.jobId);
      toast.success('Import started!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start import');
    }
  };

  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const data = await apiGet<{ job: any }>(`/apps/${appId}/import/${jobId}/status`);
        setJobStatus(data.job);
        if (data.job.status === 'completed' || data.job.status === 'failed') {
          clearInterval(interval);
        }
      } catch (err) {
        console.error(err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, appId]);

  if (!tableConfig) {
    return <div className="text-red-500">Table config not found for {config.table}</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
      <h2 className="text-xl font-bold mb-4">Import Data to {config.table}</h2>

      {!file && !jobId && (
        <div 
          onDragOver={(e) => e.preventDefault()} 
          onDrop={handleDrop}
          className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:bg-gray-50 transition-colors"
        >
          <p className="text-gray-500 mb-2">{t('drag_drop')}</p>
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            id="csv-upload"
            onChange={(e) => e.target.files && processFile(e.target.files[0])}
          />
          <label htmlFor="csv-upload" className="cursor-pointer text-blue-600 font-medium hover:underline">
            Browse Files
          </label>
        </div>
      )}

      {file && !jobId && (
        <div className="space-y-4">
          <div className="bg-blue-50 text-blue-800 p-3 rounded">
            Selected: <strong>{file.name}</strong>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Map Columns</h3>
            <p className="text-sm text-gray-500 mb-4">Match your CSV columns to the database fields.</p>
            
            <div className="space-y-3">
              {headers.map(header => (
                <div key={header} className="flex items-center gap-4">
                  <div className="w-1/3 text-sm font-medium">{header}</div>
                  <div className="w-1/3">
                    <select 
                      value={mapping[header] || ''} 
                      onChange={(e) => setMapping({ ...mapping, [header]: e.target.value })}
                      className="w-full border border-gray-300 rounded p-2 text-sm"
                    >
                      <option value="">-- Ignore --</option>
                      {tableConfig.fields.map(f => (
                        <option key={f.name} value={f.name}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={handleUpload}
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
          >
            {t('import_csv')}
          </button>
        </div>
      )}

      {jobId && jobStatus && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Import Status: {jobStatus.status}</h3>
          
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div 
              className={`h-full ${jobStatus.status === 'failed' ? 'bg-red-500' : 'bg-green-500'} transition-all duration-500`}
              style={{ width: `${jobStatus.totalRows > 0 ? (jobStatus.processedRows / jobStatus.totalRows) * 100 : 0}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600">
            {jobStatus.processedRows} of {jobStatus.totalRows} rows processed.
          </p>

          {jobStatus.errors && jobStatus.errors !== '[]' && (
            <div className="mt-4 border border-red-200 rounded">
              <div className="bg-red-50 p-2 border-b border-red-200 font-medium text-red-800">Errors</div>
              <div className="p-2 max-h-40 overflow-y-auto text-sm text-red-600">
                {JSON.parse(jobStatus.errors).map((err: any, i: number) => (
                  <div key={i}>Row {err.row}: {err.message}</div>
                ))}
              </div>
            </div>
          )}

          {(jobStatus.status === 'completed' || jobStatus.status === 'failed') && (
            <button 
              onClick={() => { setFile(null); setJobId(null); setJobStatus(null); }}
              className="mt-4 py-2 px-4 border border-gray-300 rounded hover:bg-gray-50"
            >
              Import Another File
            </button>
          )}
        </div>
      )}
    </div>
  );
}
