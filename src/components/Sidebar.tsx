'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useLanguage } from './LanguageContext';
import type { TranslationKey } from '@/lib/i18n';

const navItems: { href: string; labelKey: TranslationKey; icon: string }[] = [
  { href: '/', labelKey: 'nav.dashboard', icon: '📊' },
  { href: '/mice', labelKey: 'nav.mice', icon: '🐭' },
  { href: '/strains', labelKey: 'nav.strains', icon: '🧬' },
  { href: '/breeding', labelKey: 'nav.breeding', icon: '💑' },
  { href: '/cages', labelKey: 'nav.cages', icon: '📦' },
  { href: '/compliance', labelKey: 'nav.compliance', icon: '📋' },
  { href: '/board', labelKey: 'nav.board', icon: '📝' },
  { href: '/export', labelKey: 'nav.export', icon: '📤' },
  { href: '/settings', labelKey: 'nav.settings', icon: '⚙' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <>
      <div className="p-4 border-b border-white/10">
        <h1 className="text-lg font-bold">🐭 {t('app.shortTitle')}</h1>
      </div>
      <nav className="flex-1 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white border-l-[3px] border-white'
                  : 'hover:bg-white/10 border-l-[3px] border-transparent'
              }`}
            >
              <span>{item.icon}</span>
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-[#1e293b] text-white rounded-lg shadow-lg"
        aria-label="Open menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden print:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-60 bg-[#1e293b] text-[#e2e8f0] flex flex-col transform transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 text-white/60 hover:text-white"
          aria-label="Close menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 min-h-screen bg-[#1e293b] text-[#e2e8f0] flex-col shrink-0">
        {navContent}
      </aside>
    </>
  );
}
