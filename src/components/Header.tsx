'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from './LanguageContext';
import { useSession, signOut } from 'next-auth/react';

export default function Header() {
  const { locale, setLocale, t } = useLanguage();
  const { data: session } = useSession();
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (!session?.user) return;
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => setAnnouncement(typeof data.announcement === 'string' ? data.announcement : ''))
      .catch(() => {});
  }, [session?.user]);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shrink-0">
      {announcement ? (
        <div className="flex-1 min-w-0 overflow-hidden mr-4">
          <style jsx>{`
            @keyframes marquee {
              0% { transform: translateX(0); }
              100% { transform: translateX(-100%); }
            }
            .marquee-track {
              display: inline-block;
              white-space: nowrap;
              padding-left: 100%;
              animation: marquee 22s linear infinite;
            }
          `}</style>
          <div className="marquee-track text-sm font-medium text-indigo-700">
            📢 {announcement}
          </div>
        </div>
      ) : (
        <div />
      )}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setLocale('ja')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              locale === 'ja' ? 'bg-white text-indigo-700 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            日本語
          </button>
          <button
            onClick={() => setLocale('en')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              locale === 'en' ? 'bg-white text-indigo-700 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            English
          </button>
        </div>
        {session?.user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{session.user.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              {t('nav.logout')}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
