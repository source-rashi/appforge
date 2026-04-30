"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '../lib/api-client';
import toast from 'react-hot-toast';

export default function AppsList() {
  const router = useRouter();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfigPaste, setShowConfigPaste] = useState(false);
  const [configText, setConfigText] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Ideally, we'd have a /api/apps endpoint to list user's apps.
    // For this implementation, if they don't have apps, we show the CTA.
    // Assuming /api/apps returns a list of apps.
    apiGet<{ data: any[] }>('/apps')
      .then(res => setApps(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  const handleCreateApp = async () => {
    try {
      const parsedConfig = JSON.parse(configText);
      const res = await apiPost<{ data: any }>('/apps', parsedConfig);
      toast.success('App created successfully!');
      router.push(`/app/${res.data.id || 'default-app'}/home`); // assuming 'home' is the first page path
    } catch (err: any) {
      toast.error('Invalid JSON or server error');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Applications</h1>
          <button 
            onClick={() => {
              localStorage.removeItem('token');
              router.push('/login');
            }}
            className="text-gray-600 hover:text-gray-900"
          >
            Logout
          </button>
        </header>

        {apps.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your first app</h2>
            <p className="text-gray-500 mb-6">Paste your AppConfig JSON to instantly generate your application.</p>
            
            {!showConfigPaste ? (
              <button 
                onClick={() => setShowConfigPaste(true)}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
              >
                Get Started
              </button>
            ) : (
              <div className="text-left animate-in fade-in slide-in-from-bottom-4">
                <textarea 
                  className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm mb-4 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  placeholder='{\n  "name": "My App",\n  "database": { ... }\n}'
                  value={configText}
                  onChange={e => setConfigText(e.target.value)}
                />
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setShowConfigPaste(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreateApp}
                    className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    Generate App
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map(app => (
              <div key={app.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
                <h3 className="text-xl font-bold text-gray-900 mb-2 truncate">{app.name}</h3>
                <p className="text-sm text-gray-500 mb-4 flex-1">ID: {app.id}</p>
                <Link 
                  href={`/app/${app.id}/home`}
                  className="w-full text-center bg-indigo-50 text-indigo-600 font-medium py-2 rounded-md hover:bg-indigo-100 transition"
                >
                  Open Application
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
