"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppConfigProvider, useAppConfig } from '../../lib/config-context';
import { apiGet } from '../../lib/api-client';
import toast from 'react-hot-toast';
import { useI18n } from '../../lib/i18n-context';
import { LocaleSwitcher } from '../../components/LocaleSwitcher';

function AppShell({ children, appId }: { children: React.ReactNode; appId: string }) {
  const router = useRouter();
  const { config, loading } = useAppConfig();
  const [userEmail, setUserEmail] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Fetch user info
    apiGet<{ user: { email: string } }>('/auth/me')
      .then(res => setUserEmail(res.user.email))
      .catch(() => {
        localStorage.removeItem('token');
        router.push('/login');
      });

    // Fetch initial notification count
    apiGet<{ unreadCount: number }>('/notifications/count')
      .then(res => setUnreadCount(res.unreadCount))
      .catch(console.error);

    // Setup SSE for notifications
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const eventSource = new EventSource(`${API_URL}/notifications/stream?token=${token}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ping') return;
        
        setUnreadCount(prev => prev + 1);
        toast.success(`${t('notifications')}: ${data.subject}`);
      } catch (e) {
        // Parse error or non-JSON data
      }
    };

    return () => {
      eventSource.close();
    };
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const fetchNotifications = async () => {
    try {
      const res = await apiGet<{ notifications: any[] }>('/notifications?unreadOnly=true&pageSize=5');
      setNotifications(res.notifications);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleNotifications = () => {
    if (!showNotifications) {
      fetchNotifications();
    }
    setShowNotifications(!showNotifications);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading app config...</div>;
  }

  const appName = config?.name || 'AppForge';
  const pages = config?.pages || [];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-indigo-700 text-white p-4">
        <h1 className="font-bold text-lg">{appName}</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Sidebar (Desktop) / Mobile Menu (Toggleable) */}
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-indigo-800 text-white flex-shrink-0 relative z-10`}>
        <div className="p-4 hidden md:block">
          <h1 className="font-bold text-2xl truncate" title={appName}>{appName}</h1>
        </div>
        <nav className="p-4 space-y-2">
          {pages.map(page => (
            <Link 
              key={page.id} 
              href={`/app/${appId}${page.path}`}
              className="block px-4 py-2 rounded hover:bg-indigo-700 transition truncate"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t(page.title)}
            </Link>
          ))}
        </nav>
      </div>

      {/* Mobile Bottom Bar (Alternative to Sidebar on small screens) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 z-20 pb-safe">
         {pages.slice(0, 4).map(page => (
            <Link 
              key={page.id} 
              href={`/app/${appId}${page.path}`}
              className="flex flex-col items-center p-2 text-gray-600 hover:text-indigo-600 truncate w-1/4 text-xs"
            >
              <span>{t(page.title)}</span>
            </Link>
          ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10 hidden md:flex">
          <h2 className="text-xl font-semibold text-gray-800 truncate">{t('dashboard')}</h2>
          
          <div className="flex items-center space-x-4">
            <LocaleSwitcher />
            
            <div className="relative">
              <button onClick={toggleNotifications} className="relative p-2 text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 border border-gray-200 z-50">
                  <div className="px-4 py-2 border-b font-medium text-sm text-gray-700">{t('notifications')}</div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">{t('no_data')}</div>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} className="px-4 py-3 border-b hover:bg-gray-50">
                        <p className="text-sm font-medium text-gray-800">{notif.subject}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notif.body}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="text-sm text-gray-700 hidden sm:block truncate max-w-xs">{userEmail}</div>
            
            <button 
              onClick={handleLogout}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded transition"
            >
              {t('logout')}
            </button>
          </div>
        </header>

        {/* Mobile Header elements (Notifications/Logout) */}
        <div className="md:hidden flex justify-end p-2 space-x-2 bg-gray-50 border-b">
             <button onClick={toggleNotifications} className="relative p-2 text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white"></span>
                )}
              </button>
              <button onClick={handleLogout} className="text-xs text-red-600 px-2">{t('logout')}</button>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

import { use } from 'react';

import { I18nProvider } from '../../lib/i18n-context';

export default function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ appId: string }> }) {
  const { appId } = use(params);
  return (
    <AppConfigProvider appId={appId}>
      <I18nProvider>
        <AppShell appId={appId}>
          {children}
        </AppShell>
      </I18nProvider>
    </AppConfigProvider>
  );
}
