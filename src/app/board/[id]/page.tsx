'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageContext';
import { useSession } from 'next-auth/react';
import type { TranslationKey } from '@/lib/i18n';

interface Author { id: number; name: string | null; username: string }
interface Comment {
  id: number;
  body: string;
  author: Author;
  statusChange: string | null;
  createdAt: string;
}
interface Post {
  id: number;
  title: string;
  body: string;
  category: string;
  priority: string;
  status: string;
  pinned: boolean;
  author: Author;
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
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

export default function BoardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useLanguage();
  const { data: session } = useSession();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  // Comment form
  const [commentBody, setCommentBody] = useState('');
  const [statusChange, setStatusChange] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit form
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPriority, setEditPriority] = useState('');

  const catKey = (c: string) => `board.cat.${c}` as TranslationKey;
  const priKey = (p: string) => `board.pri.${p}` as TranslationKey;
  const stKey = (s: string) => `board.st.${s}` as TranslationKey;

  const fetchPost = useCallback(async () => {
    const res = await fetch(`/api/board/${id}`);
    if (res.ok) {
      const data = await res.json();
      setPost(data);
      setEditTitle(data.title);
      setEditBody(data.body);
      setEditCategory(data.category);
      setEditPriority(data.priority);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchPost(); }, [fetchPost]);

  const isAuthor = session?.user?.name === post?.author.name || session?.user?.name === post?.author.username;

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/board/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: commentBody, statusChange: statusChange || null }),
    });
    if (res.ok) {
      setCommentBody('');
      setStatusChange('');
      fetchPost();
    }
    setSubmitting(false);
  };

  const handlePin = async () => {
    if (!post) return;
    await fetch(`/api/board/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !post.pinned }),
    });
    fetchPost();
  };

  const handleDelete = async () => {
    if (!confirm(t('board.confirmDelete'))) return;
    const res = await fetch(`/api/board/${id}`, { method: 'DELETE' });
    if (res.ok) router.push('/board');
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/board/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, body: editBody, category: editCategory, priority: editPriority }),
    });
    setEditing(false);
    fetchPost();
  };

  if (loading) return <p className="text-sm text-gray-400">{t('common.loading')}</p>;
  if (!post) return <p className="text-sm text-red-500">Not found</p>;

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link href="/board" className="text-sm text-indigo-600 hover:underline">← {t('board.title')}</Link>
      </div>

      {/* Post card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        {editing ? (
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('board.postTitle')}</label>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('board.body')}</label>
              <textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y" required />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('board.category')}</label>
                <select value={editCategory} onChange={e => setEditCategory(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg">
                  <option value="request">{t('board.cat.request')}</option>
                  <option value="bug">{t('board.cat.bug')}</option>
                  <option value="announcement">{t('board.cat.announcement')}</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('board.priority')}</label>
                <select value={editPriority} onChange={e => setEditPriority(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg">
                  <option value="low">{t('board.pri.low')}</option>
                  <option value="medium">{t('board.pri.medium')}</option>
                  <option value="high">{t('board.pri.high')}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
                {t('common.update')}
              </button>
              <button type="button" onClick={() => setEditing(false)}
                className="px-4 py-2 bg-white text-gray-600 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
                {t('common.cancel')}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap mb-3">
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

            <h1 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h1>
            <div className="text-sm text-gray-400 mb-4">
              {post.author.name ?? post.author.username} · {new Date(post.createdAt).toLocaleString()}
            </div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{post.body}</div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-5 pt-4 border-t border-gray-100">
              <button onClick={handlePin}
                className="px-3 py-1.5 text-xs bg-amber-50 text-amber-700 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors">
                {post.pinned ? t('board.unpin') : t('board.pin')}
              </button>
              {isAuthor && (
                <>
                  <button onClick={() => setEditing(true)}
                    className="px-3 py-1.5 text-xs bg-gray-50 text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                    {t('common.edit')}
                  </button>
                  <button onClick={handleDelete}
                    className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg border border-red-200 hover:bg-red-100 transition-colors">
                    {t('common.delete')}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Comments */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        {t('board.comments')} ({post.comments.length})
      </h2>

      {post.comments.length > 0 && (
        <div className="space-y-3 mb-6">
          {post.comments.map(comment => (
            <div key={comment.id} className="bg-white rounded-xl border border-gray-200 p-4">
              {comment.statusChange && (
                <div className="mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: STATUS_COLORS[comment.statusChange]?.bg, color: STATUS_COLORS[comment.statusChange]?.text }}>
                    → {t(stKey(comment.statusChange))}
                  </span>
                </div>
              )}
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.body}</p>
              <div className="text-xs text-gray-400 mt-2">
                {comment.author.name ?? comment.author.username} · {new Date(comment.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add comment form */}
      <form onSubmit={handleComment} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('board.addComment')}</h3>
        <textarea
          value={commentBody} onChange={e => setCommentBody(e.target.value)}
          rows={3} placeholder={t('board.body')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y text-sm mb-3"
          required
        />
        <div className="flex items-center gap-3">
          <select value={statusChange} onChange={e => setStatusChange(e.target.value)}
            className="h-9 px-3 border border-gray-300 rounded-lg text-sm">
            <option value="">{t('board.changeStatus')}: {t('common.none')}</option>
            <option value="open">{t('board.st.open')}</option>
            <option value="in_progress">{t('board.st.in_progress')}</option>
            <option value="resolved">{t('board.st.resolved')}</option>
            <option value="rejected">{t('board.st.rejected')}</option>
          </select>
          <button type="submit" disabled={submitting}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 transition-colors">
            {submitting ? t('common.processing') : t('board.addComment')}
          </button>
        </div>
      </form>
    </div>
  );
}
