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
    <div className="min-h-screen bg-[#09090b] p-8 text-white">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gradient mb-2">Your Applications</h1>
            <p className="text-zinc-400">Manage and deploy your generated systems</p>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('token');
              router.push('/login');
            }}
            className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all duration-200"
          >
            Logout
          </button>
        </header>

        {apps.length === 0 ? (
          <div className="glass-panel rounded-3xl p-16 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Create your first app</h2>
            <p className="text-zinc-400 mb-10 max-w-md mx-auto">Paste your AppConfig JSON to instantly generate a high-performance, production-ready application.</p>
            
            {!showConfigPaste ? (
              <button 
                onClick={() => setShowConfigPaste(true)}
                className="bg-primary text-white px-8 py-4 rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                Get Started
              </button>
            ) : (
              <div className="text-left animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000"></div>
                  <textarea 
                    className="relative w-full h-80 p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl font-mono text-sm mb-6 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-indigo-100 placeholder:text-zinc-600"
                    placeholder='{
  "name": "My Pro App",
  "database": { ... },
  "api": { ... },
  "pages": [ ... ]
}'
                    value={configText}
                    onChange={e => setConfigText(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-4">
                  <button 
                    onClick={() => setShowConfigPaste(false)}
                    className="px-6 py-3 text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreateApp}
                    className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all shadow-xl active:scale-95"
                  >
                    Generate Application
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {apps.map(app => (
              <div key={app.id} className="glass-panel rounded-2xl p-8 group hover:border-primary/30 transition-all duration-300 flex flex-col h-full hover:-translate-y-1">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 truncate group-hover:text-primary transition-colors">{app.name}</h3>
                <p className="text-sm text-zinc-500 mb-8 flex-1 font-mono">{app.id}</p>
                <Link 
                  href={`/app/${app.id}/home`}
                  className="w-full text-center bg-zinc-900 border border-zinc-800 text-white font-bold py-3 rounded-xl hover:bg-primary hover:border-primary transition-all duration-300"
                >
                  Enter Platform
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
