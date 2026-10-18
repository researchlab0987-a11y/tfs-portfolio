'use client';
/**
 * Password protection for permanent deletion.
 *
 *   const ok = await requirePassword({ title, message, confirmLabel });
 *
 * Live mode: the editor re-enters their Firebase sign-in password
 * (reauthenticateWithCredential). This also refreshes the sign-in time in
 * their ID token, which firestore.rules checks: permanent deletes are refused
 * by the server unless the password was entered in the last 10 minutes.
 *
 * Local mode (no Firebase): a deletion password for this browser, created on
 * first use and stored only as a salted SHA-256 hash.
 *
 * After a correct password, further permanent deletions within 5 minutes only
 * ask for a click. Five wrong attempts lock the form for a minute.
 * <PasswordHost /> is mounted once in Providers.
 */
import Modal from '@/components/ui/Modal';
import { FIREBASE_CONFIGURED, isForcedLocal } from '@/lib/store';
import { safeLocalStorage } from '@/lib/utils';
import { KeyRound, Loader2, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const LOCAL_KEY = 'tfs:local-delete-pass';
const GRACE_MS = 5 * 60 * 1000;
const MAX_TRIES = 5;
const LOCK_MS = 60 * 1000;

let lastVerified = 0;
let tries = 0;
let lockedUntil = 0;
let show = null;
const queue = [];

const liveMode = () => FIREBASE_CONFIGURED && !isForcedLocal();

export function requirePassword(options = {}) {
  return new Promise((resolve) => {
    const req = { ...options, resolve };
    if (show) show(req);
    else queue.push(req);
  });
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

function readLocal() {
  try {
    return JSON.parse(safeLocalStorage()?.getItem(LOCAL_KEY) || 'null');
  } catch {
    return null;
  }
}

async function firebaseUser() {
  const { getFirebase } = await import('@/lib/firebase');
  return getFirebase()?.auth?.currentUser || null;
}

function authMessage(err) {
  const code = err?.code || '';
  if (code.includes('wrong-password') || code.includes('invalid-credential') || code.includes('invalid-login')) return 'That password is not correct.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Firebase has paused sign-in for a while; try again later.';
  if (code.includes('network')) return 'No connection. Permanent deletion needs to reach Firebase.';
  if (code.includes('user-mismatch') || code.includes('user-not-found')) return 'This account could not be verified. Sign out and in again.';
  return err?.message || 'The password could not be checked.';
}

export function PasswordHost() {
  const [req, setReq] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [hasLocal, setHasLocal] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    setMounted(true);
    show = (r) => {
      setPassword('');
      setPassword2('');
      setError('');
      setNote('');
      setReq(r);
    };
    if (queue.length) show(queue.shift());
    return () => {
      show = null;
    };
  }, []);

  useEffect(() => {
    if (!req) return undefined;
    setHasLocal(Boolean(readLocal()));
    if (liveMode()) firebaseUser().then((u) => setEmail(u?.email || ''));
    const t = setTimeout(() => document.getElementById('gate-password')?.focus(), 40);
    return () => clearTimeout(t);
  }, [req]);

  const finish = (ok) => {
    req?.resolve(ok);
    setReq(null);
  };

  if (!mounted || !req) return null;

  const live = liveMode();
  const recent = Date.now() - lastVerified < GRACE_MS;
  const creating = !live && !hasLocal;
  const locked = Date.now() < lockedUntil;

  const verify = async () => {
    setError('');
    if (recent) return finish(true);
    if (locked) return setError(`Locked after ${MAX_TRIES} wrong attempts. Try again in a minute.`);
    if (!password) return setError('Enter the password.');
    setBusy(true);
    try {
      if (live) {
        const user = await firebaseUser();
        if (!user?.email) throw Object.assign(new Error('Sign in again to delete permanently.'), { code: 'user-not-found' });
        const { EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth');
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
        await user.getIdToken(true); // new sign-in time for the server rules
      } else if (creating) {
        if (password.length < 6) throw new Error('Use at least 6 characters.');
        if (password !== password2) throw new Error('The two passwords do not match.');
        const salt = crypto.getRandomValues(new Uint32Array(4)).join('-');
        safeLocalStorage()?.setItem(LOCAL_KEY, JSON.stringify({ salt, hash: await sha256(`${salt}:${password}`) }));
      } else {
        const saved = readLocal();
        if ((await sha256(`${saved.salt}:${password}`)) !== saved.hash) throw Object.assign(new Error('That password is not correct.'), { code: 'wrong-password' });
      }
      tries = 0;
      lastVerified = Date.now();
      finish(true);
    } catch (err) {
      if (/wrong-password|invalid-credential|invalid-login/.test(err?.code || '')) {
        tries += 1;
        if (tries >= MAX_TRIES) {
          lockedUntil = Date.now() + LOCK_MS;
          tries = 0;
        }
      }
      setError(live ? authMessage(err) : err.message);
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    try {
      const [{ getFirebase }, { sendPasswordResetEmail }] = await Promise.all([import('@/lib/firebase'), import('firebase/auth')]);
      await sendPasswordResetEmail(getFirebase().auth, email);
      setNote(`A password reset link was sent to ${email}.`);
    } catch (err) {
      setError(authMessage(err));
    }
  };

  return createPortal(
    <Modal
      open
      onClose={() => !busy && finish(false)}
      title={req.title || 'Delete permanently?'}
      size="sm"
      footer={
        <>
          <button type="button" className="ui-btn" onClick={() => finish(false)} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="ui-btn !border-red-600 !bg-red-600 !text-white hover:!bg-red-700 disabled:!opacity-40" onClick={verify} disabled={busy || locked}>
            {busy && <Loader2 size={14} className="animate-spin" />}
            {req.confirmLabel || 'Delete forever'}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-50 text-red-600">
          <ShieldAlert size={18} />
        </span>
        <form
          className="min-w-0 flex-1 space-y-3 text-[13.5px] text-slate-700"
          onSubmit={(e) => {
            e.preventDefault();
            verify();
          }}
        >
          {req.message && <p>{req.message}</p>}
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[12.5px] text-red-800">This cannot be undone. It is removed from {live ? 'the database' : 'this browser'} for good.</p>

          {recent ? (
            <p className="flex items-center gap-2 text-[12.5px] text-emerald-700">
              <KeyRound size={14} /> Password confirmed a moment ago.
            </p>
          ) : (
            <>
              <div>
                <label className="ui-label" htmlFor="gate-password">
                  {live ? `Password for ${email || 'your account'}` : creating ? 'Create a deletion password for this browser' : 'Deletion password'}
                </label>
                <input
                  id="gate-password"
                  type="password"
                  className="ui-input"
                  autoComplete={creating ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {creating && (
                <div>
                  <label className="ui-label" htmlFor="gate-password2">
                    Type it again
                  </label>
                  <input id="gate-password2" type="password" className="ui-input" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
                  <p className="ui-help">Local mode has no account, so this password protects permanent deletion on this browser only.</p>
                </div>
              )}
              {live && email && (
                <button type="button" onClick={sendReset} className="text-[12px] font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline">
                  Forgot the password? Email me a reset link
                </button>
              )}
            </>
          )}
          {error && <p className="text-[12.5px] font-medium text-red-600">{error}</p>}
          {note && <p className="text-[12.5px] text-emerald-700">{note}</p>}
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>
      </div>
    </Modal>,
    document.body
  );
}
