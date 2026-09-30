'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { useLanguage } from '@/components/LanguageContext';
import { useSession } from 'next-auth/react';
import { formatDate } from '@/lib/date-utils';
import { SEX_LABELS, STATUS_COLORS, STATUS_LABELS } from '@/lib/constants';
import { mouseUrl } from '@/lib/utils';

interface DashboardData {
  stats: { totalMice: number; aliveMice: number; totalStrains: number; activePairs: number; totalCages: number };
  recentMice: any[];
  strainCounts: { name: string; color: string; count: number }[];
  complianceAlerts: { id: number; approvalNumber: string; title: string; used: number; allowed: number; ratio: number }[];
  cageAlerts: { id: number; cageCode: string; current: number; max: number }[];
  weaningAlerts: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const { t, locale } = useLanguage();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'admin';

  const [announcement, setAnnouncement] = useState('');
  const [announcementSaved, setAnnouncementSaved] = useState(false);

  useEffect(() => { fetch('/api/dashboard').then(r => r.json()).then(setData); }, []);
  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => setAnnouncement(typeof data.announcement === 'string' ? data.announcement : ''));
  }, []);

  const handleSaveAnnouncement = async () => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcement }),
    });
    if (res.ok) {
      setAnnouncementSaved(true);
      setTimeout(() => setAnnouncementSaved(false), 3000);
    }
  };

  if (!data) return <div className="p-8 text-center text-slate-400">{t('common.loading')}</div>;

  const statCards = [
    { label: t('dashboard.aliveMice'), value: data.stats.aliveMice, sub: `${t('dashboard.totalMice')}: ${data.stats.totalMice}`, href: '/mice', color: 'bg-blue-50 text-blue-700' },
    { label: t('dashboard.strainCount'), value: data.stats.totalStrains, href: '/strains', color: 'bg-purple-50 text-purple-700' },
    { label: t('dashboard.activePairs'), value: data.stats.activePairs, href: '/breeding', color: 'bg-pink-50 text-pink-700' },
    { label: t('dashboard.cageCount'), value: data.stats.totalCages, href: '/cages', color: 'bg-green-50 text-green-700' },
  ];

  return (
    <div>
      <PageHeader title={t('dashboard.title')} description={t('dashboard.description')} />

      {isAdmin && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="font-semibold mb-1">{t('dashboard.announcement')}</h2>
          <p className="text-xs text-slate-500 mb-3">{t('dashboard.announcementHint')}</p>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <input
              type="text"
              value={announcement}
              onChange={e => setAnnouncement(e.target.value)}
              placeholder={t('dashboard.announcementPlaceholder')}
              className="flex-1 w-full border rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={handleSaveAnnouncement} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
                {t('common.save')}
              </button>
              {announcementSaved && <span className="text-sm text-green-600">{t('settings.saved')}</span>}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(card => (
          <Link key={card.label} href={card.href} className={`${card.color} p-4 rounded-lg hover:shadow-md transition-shadow`}>
            <div className="text-3xl font-bold">{card.value}</div>
            <div className="text-sm font-medium mt-1">{card.label}</div>
            {card.sub && <div className="text-xs mt-0.5 opacity-75">{card.sub}</div>}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(data.complianceAlerts.length > 0 || data.cageAlerts.length > 0 || data.weaningAlerts.length > 0) && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="font-semibold mb-4 text-red-600">{t('dashboard.alerts')}</h2>
            <div className="space-y-3">
              {data.complianceAlerts.map(a => (
                <Link key={a.id} href={`/compliance/${a.id}`} className="block p-3 bg-red-50 rounded-lg text-sm hover:bg-red-100">
                  <span className="font-medium">{a.approvalNumber}</span>: {t('dashboard.usageCount')} {a.used}/{a.allowed} ({Math.round(a.ratio * 100)}%)
                </Link>
              ))}
              {data.cageAlerts.map(a => (
                <Link key={a.id} href="/cages" className="block p-3 bg-yellow-50 rounded-lg text-sm hover:bg-yellow-100">
                  {t('nav.cages')} {a.cageCode}: {t('dashboard.cageCapacity')} {a.current}/{a.max}
                </Link>
              ))}
              {data.weaningAlerts.map((a: any) => (
                <Link key={a.id} href={`/breeding/${a.matingPairId}`} className="block p-3 bg-orange-50 rounded-lg text-sm hover:bg-orange-100">
                  {t('dashboard.weaningOverdue')}: {t('dashboard.birthDate')} {formatDate(a.birthDate)} ({a.pupCount} {locale === 'ja' ? '匹' : 'pups'})
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="font-semibold mb-4">{t('dashboard.strainDistribution')}</h2>
          <div className="space-y-3">
            {data.strainCounts.map(s => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-sm flex-1">{s.name}</span>
                <span className="text-sm font-medium">{s.count}</span>
              </div>
            ))}
            {data.strainCounts.length === 0 && <p className="text-sm text-slate-400">{t('common.noData')}</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="font-semibold mb-4">{t('dashboard.recentMice')}</h2>
          <div className="space-y-2">
            {data.recentMice.map((m: any) => (
              <Link key={m.id} href={mouseUrl(m.mouseCode)} className="flex items-center justify-between text-sm py-2 border-b last:border-0 hover:bg-slate-50 px-2 rounded">
                <span className="font-medium text-indigo-600">{m.mouseCode}</span>
                <span>{SEX_LABELS[m.sex]}</span>
                <span>{m.strain.name}</span>
                <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: STATUS_COLORS[m.status]?.bg, color: STATUS_COLORS[m.status]?.text }}>{STATUS_LABELS[m.status]?.[locale]}</span>
              </Link>
            ))}
            {data.recentMice.length === 0 && <p className="text-sm text-slate-400">{t('common.noData')}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
