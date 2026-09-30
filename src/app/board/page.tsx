'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageContext';
import PageHeader from '@/components/PageHeader';
import type { TranslationKey } from '@/lib/i18n';

interface Post {
  id: number;
  title: string;
  body: string;
  category: string;
  priority: string;
  status: string;
  pinned: boolean;
  author: { id: number; name: string | null; username: string };
  _count: { comments: number };
  createdAt: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: '#FEF9C3', text: '#854D0E' },
  in_progress: { bg: '#DBEAFE', text: '#1E40AF' },
  resolved: { bg: '#DCFCE7', text: '#166534' },
  rejected: { bg: '#F3F4F6', text: '#374151' },
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  high: { bg: '#FEE2E2', text: '#991B1B' },
  medium: { bg: '#FEF9C3', text: '#854D0E' },
  low: { bg: '#F3F4F6', text: '#374151' },
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  request: { bg: '#EEF2FF', text: '#4338CA' },
  bug: { bg: '#FEE2E2', text: '#991B1B' },
  announcement: { bg: '#DCFCE7', text: '#166534' },
};

export default function BoardPage() {
  const { t } = useLanguage();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch] = useState('');

  // form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('request');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);

  // Load filters from localStorage
  useEffect(() => {
    setFilterCategory(localStorage.getItem('board.category') || '');
    setFilterStatus(localStorage.getItem('board.status') || '');
    setFilterPriority(localStorage.getItem('board.priority') || '');
  }, []);

  const fetchPosts = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterCategory) params.set('category', filterCategory);
    if (filterStatus) params.set('status', filterStatus);
    if (filterPriority) params.set('priority', filterPriority);
    if (search) params.set('search', search);
    const res = await fetch(`/api/board?${params}`);
    if (res.ok) setPosts(await res.json());
    setLoading(false);
  }, [filterCategory, filterStatus, filterPriority, search]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Persist filters
  useEffect(() => { localStorage.setItem('board.category', filterCategory); }, [filterCategory]);
  useEffect(() => { localStorage.setItem('board.status', filterStatus); }, [filterStatus]);
  useEffect(() => { localStorage.setItem('board.priority', filterPriority); }, [filterPriority]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    const res = await fetch('/api/board', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, category, priority }),
    });
    if (res.ok) {
      setTitle(''); setBody(''); setCategory('request'); setPriority('medium');
      setShowForm(false);
      fetchPosts();
    }
    setSubmitting(false);
  };

  const catKey = (c: string) => `board.cat.${c}` as TranslationKey;
  const priKey = (p: string) => `board.pri.${p}` as TranslationKey;
  const stKey = (s: string) => `board.st.${s}` as TranslationKey;

  return (
    <div>
      <PageHeader
        title={t('board.title')}
        description={t('board.description')}
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {t('board.new')}
          </button>
        }
      />

      {/* New post form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6 max-w-2xl">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('board.postTitle')}</label>
              <input
                value={title} onChange={e => setTitle(e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('board.body')}</label>
              <textarea
                value={body} onChange={e => setBody(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition resize-y"
                required
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('board.category')}</label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg">
                  <option value="request">{t('board.cat.request')}</option>
                  <option value="bug">{t('board.cat.bug')}</option>
                  <option value="announcement">{t('board.cat.announcement')}</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('board.priority')}</label>
                <select value={priority} onChange={e => setPriority(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg">
                  <option value="low">{t('board.pri.low')}</option>
                  <option value="medium">{t('board.pri.medium')}</option>
                  <option value="high">{t('board.pri.high')}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 transition-colors">
                {submitting ? t('common.processing') : t('common.save')}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-white text-gray-600 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('common.search')}
          className="h-9 px-3 border border-gray-300 rounded-lg text-sm w-48"
        />
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="h-9 px-3 border border-gray-300 rounded-lg text-sm">
          <option value="">{t('board.category')}: {t('common.all')}</option>
          <option value="request">{t('board.cat.request')}</option>
          <option value="bug">{t('board.cat.bug')}</option>
          <option value="announcement">{t('board.cat.announcement')}</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="h-9 px-3 border border-gray-300 rounded-lg text-sm">
          <option value="">{t('board.status')}: {t('common.all')}</option>
          <option value="open">{t('board.st.open')}</option>
          <option value="in_progress">{t('board.st.in_progress')}</option>
          <option value="resolved">{t('board.st.resolved')}</option>
          <option value="rejected">{t('board.st.rejected')}</option>
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          className="h-9 px-3 border border-gray-300 rounded-lg text-sm">
          <option value="">{t('board.priority')}: {t('common.all')}</option>
          <option value="high">{t('board.pri.high')}</option>
          <option value="medium">{t('board.pri.medium')}</option>
          <option value="low">{t('board.pri.low')}</option>
        </select>
      </div>

      {/* Posts list */}
      {loading ? (
        <p className="text-sm text-gray-400">{t('common.loading')}</p>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          {t('board.noPosts')}
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <Link key={post.id} href={`/board/${post.id}`}
              className="block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {post.pinned && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                        📌 {t('board.pinned')}
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: CATEGORY_COLORS[post.category]?.bg, color: CATEGORY_COLORS[post.category]?.text }}>
                      {t(catKey(post.category))}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: PRIORITY_COLORS[post.priority]?.bg, color: PRIORITY_COLORS[post.priority]?.text }}>
                      {t(priKey(post.priority))}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: STATUS_COLORS[post.status]?.bg, color: STATUS_COLORS[post.status]?.text }}>
                      {t(stKey(post.status))}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 truncate">{post.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{post.body}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>{post.author.name ?? post.author.username}</span>
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    {post._count.comments > 0 && (
                      <span>💬 {post._count.comments}</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
