'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useLanguage } from '@/components/LanguageContext';
import { useSession } from 'next-auth/react';
import { formatDate } from '@/lib/date-utils';

interface User {
  id: number;
  username: string;
  name: string | null;
  role: string;
  createdAt: string;
}

interface Strain {
  id: number;
  name: string;
  color: string;
}

export default function SettingsPage() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'admin';

  const [baseUrl, setBaseUrl] = useState('');
  const [savedBaseUrl, setSavedBaseUrl] = useState('');
  const [boardNotifyEmail, setBoardNotifyEmail] = useState('');
  const [saved, setSaved] = useState(false);

  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [smtpSaved, setSmtpSaved] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ username: '', name: '', password: '', role: 'user' });
  const [userError, setUserError] = useState('');
  const [editingPw, setEditingPw] = useState<number | null>(null);
  const [newPw, setNewPw] = useState('');

  // Strain access control
  const [allStrains, setAllStrains] = useState<Strain[]>([]);
  const [editingStrains, setEditingStrains] = useState<number | null>(null);
  const [selectedStrainIds, setSelectedStrainIds] = useState<number[]>([]);

  // My profile (self-service email, for due-date reminder notifications)
  const [profileEmail, setProfileEmail] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(data => setProfileEmail(data.email || ''));
  }, []);

  const handleSaveProfile = async () => {
    setProfileError('');
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: profileEmail }),
    });
    if (res.ok) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } else {
      const d = await res.json();
      setProfileError(d.error || 'エラー');
    }
  };

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      const url = data.baseUrl || '';
      setBaseUrl(url);
      setSavedBaseUrl(url);
      setBoardNotifyEmail(data.boardNotifyEmail || '');
      setSmtpUser(data.smtpUser || '');
      setSmtpConfigured(!!data.smtpConfigured);
    });
    if (isAdmin) {
      fetchUsers();
      fetch('/api/strains').then(r => r.json()).then((strains: Strain[]) => setAllStrains(strains));
    }
  }, [isAdmin]);

  const fetchUsers = () => {
    fetch('/api/users').then(r => r.json()).then(setUsers);
  };

  const handleSave = async () => {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl, boardNotifyEmail }),
    });
    setSavedBaseUrl(baseUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSaveSmtp = async () => {
    const body: Record<string, string> = { smtpUser };
    if (smtpPass) body.smtpPass = smtpPass;
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      if (smtpPass) setSmtpConfigured(true);
      else if (!smtpUser) setSmtpConfigured(false); // clearing the account also clears its password
      setSmtpPass('');
      setSmtpSaved(true);
      setTimeout(() => setSmtpSaved(false), 3000);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });
    if (res.ok) {
      setNewUser({ username: '', name: '', password: '', role: 'user' });
      fetchUsers();
    } else {
      const data = await res.json();
      setUserError(data.error || t('common.processing'));
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm(t('settings.confirmDeleteUser'))) return;
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    fetchUsers();
  };

  const handleChangePw = async (id: number) => {
    if (!newPw) return;
    await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPw }),
    });
    setEditingPw(null);
    setNewPw('');
  };

  const handleEditStrains = async (userId: number) => {
    setEditingStrains(userId);
    try {
      const res = await fetch(`/api/users/${userId}/strains`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setUserError(data.error || `Error: ${res.status}`);
        setSelectedStrainIds([]);
        return;
      }
      const ids: number[] = await res.json();
      setSelectedStrainIds(ids);
    } catch (err: any) {
      setUserError(err.message || 'Failed to load strain assignments');
      setSelectedStrainIds([]);
    }
  };

  const handleSaveStrains = async (userId: number) => {
    const res = await fetch(`/api/users/${userId}/strains`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strainIds: selectedStrainIds }),
    });
    if (!res.ok) {
      const data = await res.json();
      setUserError(data.error || 'Failed to save');
    }
    setEditingStrains(null);
    setSelectedStrainIds([]);
  };

  const toggleStrainId = (strainId: number) => {
    setSelectedStrainIds(prev =>
      prev.includes(strainId) ? prev.filter(id => id !== strainId) : [...prev, strainId]
    );
  };

  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);

  const exampleUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/mice/ExampleStrain-0001` : origin ? `${origin}/mice/ExampleStrain-0001` : '/mice/ExampleStrain-0001';

  return (
    <div className="space-y-6">
      <PageHeader title={t('settings.title')} description={t('settings.description')} />

      <div className="bg-white p-6 rounded-lg shadow max-w-2xl">
        <h2 className="font-semibold mb-1">{t('settings.myProfile')}</h2>
        <p className="text-xs text-slate-500 mb-3">{t('settings.myProfileHint')}</p>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <input
            type="email"
            value={profileEmail}
            onChange={e => setProfileEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 w-full border rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={handleSaveProfile} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
              {t('common.save')}
            </button>
            {profileSaved && <span className="text-sm text-green-600">{t('settings.saved')}</span>}
          </div>
        </div>
        {profileError && <p className="mt-2 text-sm text-red-600">{profileError}</p>}
      </div>

      {isAdmin && (
        <div className="bg-white p-6 rounded-lg shadow max-w-2xl">
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">{t('settings.baseUrl')}</label>
            {origin && (
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs text-slate-500">現在のURL:</span>
                <code className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded break-all">{origin}</code>
                <button
                  type="button"
                  onClick={() => setBaseUrl(origin)}
                  className="text-xs text-indigo-600 hover:underline whitespace-nowrap"
                >
                  このURLを使用
                </button>
              </div>
            )}
            {savedBaseUrl && (
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs text-slate-500">設定済みURL:</span>
                <code className="text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded break-all">{savedBaseUrl}</code>
              </div>
            )}
            <input
              type="url"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">{t('settings.baseUrlHint')}</p>
          </div>

          <div className="mb-6 p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">{t('settings.currentQrExample')}</p>
            <code className="text-sm text-indigo-600 break-all">{exampleUrl}</code>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">{t('settings.boardNotifyEmail')}</label>
            <input
              type="text"
              value={boardNotifyEmail}
              onChange={e => setBoardNotifyEmail(e.target.value)}
              placeholder="you@example.com; another@example.com"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">{t('settings.boardNotifyEmailHint')}</p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
              {t('common.save')}
            </button>
            {saved && <span className="text-sm text-green-600">{t('settings.saved')}</span>}
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="bg-white p-6 rounded-lg shadow max-w-2xl">
          <h2 className="font-semibold text-lg mb-1">{t('settings.smtpSettings')}</h2>
          <p className="text-xs text-slate-500">{t('settings.smtpSettingsHint')}</p>
          <a
            href="https://myaccount.google.com/apppasswords"
            target="_blank"
            rel="noreferrer"
            className="mb-4 inline-block text-xs text-indigo-600 hover:underline"
          >
            {t('settings.smtpAppPasswordLink')}
          </a>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">{t('settings.smtpUser')}</label>
            <input
              type="email"
              value={smtpUser}
              onChange={e => setSmtpUser(e.target.value)}
              placeholder="notify@example.com"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 flex items-center gap-2">
              {t('settings.smtpPass')}
              {smtpConfigured && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  {t('settings.smtpPassConfigured')}
                </span>
              )}
            </label>
            <input
              type="password"
              value={smtpPass}
              onChange={e => setSmtpPass(e.target.value)}
              placeholder={smtpConfigured ? '••••••••••••••••' : ''}
              autoComplete="new-password"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">{t('settings.smtpPassHint')}</p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleSaveSmtp} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
              {t('common.save')}
            </button>
            {smtpSaved && <span className="text-sm text-green-600">{t('settings.saved')}</span>}
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="bg-white p-6 rounded-lg shadow max-w-2xl">
          <h2 className="font-semibold text-lg mb-4">{t('settings.userManagement')}</h2>

          <table className="w-full text-sm mb-6">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-3 py-2">{t('settings.userId')}</th>
                <th className="text-left px-3 py-2">{t('settings.displayName')}</th>
                <th className="text-left px-3 py-2">{t('settings.role')}</th>
                <th className="text-left px-3 py-2">{t('settings.allowedStrains')}</th>
                <th className="text-left px-3 py-2">{t('settings.createdDate')}</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t align-top">
                  <td className="px-3 py-2 font-mono">{u.username}</td>
                  <td className="px-3 py-2">{u.name || '-'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                      {u.role === 'admin' ? t('settings.roleAdmin') : t('settings.roleUser')}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {u.role === 'admin' ? (
                      <span className="text-xs text-slate-400">{t('settings.allStrains')}</span>
                    ) : editingStrains === u.id ? (
                      <div className="space-y-1">
                        {allStrains.map(s => (
                          <label key={s.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedStrainIds.includes(s.id)}
                              onChange={() => toggleStrainId(s.id)}
                              className="rounded"
                            />
                            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.name}
                          </label>
                        ))}
                        <div className="flex gap-2 mt-1">
                          <button onClick={() => handleSaveStrains(u.id)} className="text-xs text-indigo-600 hover:underline">{t('common.save')}</button>
                          <button onClick={() => { setEditingStrains(null); setSelectedStrainIds([]); }} className="text-xs text-gray-500 hover:underline">{t('common.cancel')}</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => handleEditStrains(u.id)} className="text-xs text-indigo-600 hover:underline">
                        {t('settings.editStrainAccess')}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{formatDate(u.createdAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2 justify-end">
                      {editingPw === u.id ? (
                        <>
                          <input
                            type="password"
                            placeholder={t('settings.newPassword')}
                            value={newPw}
                            onChange={e => setNewPw(e.target.value)}
                            className="border rounded px-2 py-1 text-xs w-32"
                          />
                          <button onClick={() => handleChangePw(u.id)} className="text-xs text-indigo-600 hover:underline">{t('common.save')}</button>
                          <button onClick={() => { setEditingPw(null); setNewPw(''); }} className="text-xs text-gray-500 hover:underline">{t('common.cancel')}</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditingPw(u.id)} className="text-xs text-indigo-600 hover:underline">{t('settings.changePw')}</button>
                          <button onClick={() => handleDeleteUser(u.id)} className="text-xs text-red-500 hover:underline">{t('common.delete')}</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="font-medium mb-3 text-sm">{t('settings.addUser')}</h3>
          <form onSubmit={handleAddUser} className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">{t('settings.userId')} *</label>
              <input value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">{t('settings.displayName')}</label>
              <input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">{t('settings.password')} *</label>
              <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">{t('settings.role')}</label>
              <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="user">{t('settings.roleUser')}</option>
                <option value="admin">{t('settings.roleAdmin')}</option>
              </select>
            </div>
            {userError && <p className="col-span-2 text-sm text-red-600">{userError}</p>}
            <div className="col-span-2">
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">{t('common.add')}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
