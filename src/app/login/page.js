'use client';
import { useAdmin } from '@/context/AdminContext';
import { FIREBASE_CONFIGURED } from '@/lib/store';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function LoginPage() {
  const { isAdmin, liveMode, signIn, enterLocalEditor, setEditMode, authReady } = useAdmin();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const justSignedIn = useRef(false);

  useEffect(() => {
    document.title = 'Sign in';
    if (authReady && isAdmin && !justSignedIn.current) router.replace('/admin');
  }, [authReady, isAdmin, router]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      justSignedIn.current = true;
      await signIn(email, password);
      setEditMode(true);
      router.push('/');
    } catch (err) {
      justSignedIn.current = false;
      setError(String(err.message || err).replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ui flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
        <h1 className="text-xl font-semibold">Edit the website</h1>
        {liveMode ? (
          <form onSubmit={submit} className="mt-5 space-y-3">
            <div>
              <label className="ui-label" htmlFor="email">Email</label>
              <input id="email" type="email" required className="ui-input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </div>
            <div>
              <label className="ui-label" htmlFor="password">Password</label>
              <input id="password" type="password" required className="ui-input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            {error && <p className="text-[13px] text-red-700">{error}</p>}
            <button type="submit" className="ui-btn ui-btn-primary w-full !py-2.5" disabled={busy}>
              {busy && <Loader2 size={14} className="animate-spin" />} Sign in
            </button>
          </form>
        ) : (
          <div className="mt-4 space-y-4 text-[13.5px] text-slate-600">
            <p>
              {FIREBASE_CONFIGURED
                ? 'Local mode is on. Your edits are saved in this browser only.'
                : 'Firebase is not connected yet, so the site runs on its bundled content. You can still edit everything; changes are saved in this browser and can be downloaded or published later from Dashboard, Data.'}
            </p>
            <button
              type="button"
              className="ui-btn ui-btn-primary w-full !py-2.5"
              onClick={() => {
                justSignedIn.current = true;
                enterLocalEditor();
                setEditMode(true);
                router.push('/');
              }}
            >
              Open the local editor
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
