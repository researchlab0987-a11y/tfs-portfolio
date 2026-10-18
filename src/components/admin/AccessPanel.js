'use client';
/**
 * Access (super admin only): add admins, choose exactly what each one may
 * edit, pause or remove them, and create their login (a password-setup link
 * is emailed to them). Admin documents live in Firestore `admins/{email}`;
 * firestore.rules lets only the super admin read the list or change it.
 */
import { confirmDanger } from '@/components/ui/ConfirmDialog';
import { useAdmin } from '@/context/AdminContext';
import { adminDocId, DEFAULT_ADMIN_PERMS, PERMISSIONS, SUPER_ADMINS } from '@/lib/access';
import { useSchema } from '@/lib/store';
import { cx } from '@/lib/utils';
import { Crown, KeyRound, Loader2, MailPlus, Pause, Play, Save, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

async function fs() {
  const [{ getFirebase }, mod] = await Promise.all([import('@/lib/firebase'), import('firebase/firestore')]);
  const fb = getFirebase();
  if (!fb) throw new Error('Firebase is not available.');
  return { db: fb.db, ...mod };
}

/** Create the login (if needed) without signing the super admin out, then email a password link. */
async function inviteLogin(email) {
  const [{ initializeApp, getApps }, auth, { firebaseConfig }] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('@/lib/firebase')]);
  const app = getApps().find((a) => a.name === 'invite') || initializeApp(firebaseConfig, 'invite');
  const a2 = auth.getAuth(app);
  const temp = `${crypto.getRandomValues(new Uint32Array(4)).join('')}Aa!`;
  let created = false;
  try {
    await auth.createUserWithEmailAndPassword(a2, email, temp);
    created = true;
    await auth.signOut(a2);
  } catch (err) {
    if (!String(err?.code).includes('email-already-in-use')) throw err;
  }
  await auth.sendPasswordResetEmail(a2, email);
  return created;
}

function authError(err) {
  const c = String(err?.code || '');
  if (c.includes('operation-not-allowed') || c.includes('configuration-not-found')) return 'Email/Password sign-in is not enabled in Firebase Authentication yet.';
  if (c.includes('invalid-email')) return 'That email address is not valid.';
  if (c.includes('too-many-requests')) return 'Too many attempts. Try again later.';
  return err?.message || 'Something went wrong.';
}

function PermEditor({ value, onChange, lists }) {
  const content = value.content;
  const all = content === 'all';
  const chosen = Array.isArray(content) ? content : [];
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {PERMISSIONS.map((p) => (
          <label key={p.key} className={cx('flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5', value[p.key] ? 'border-[#0d7a6f]/40 bg-[#0d7a6f]/5' : 'border-slate-200')}>
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#0d7a6f]" checked={Boolean(value[p.key])} onChange={(e) => set({ [p.key]: e.target.checked })} />
            <span>
              <span className="block text-[13px] font-semibold text-slate-800">{p.label}</span>
              <span className="block text-[11.5px] leading-snug text-slate-500">{p.help}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="rounded-lg border border-slate-200 p-3">
        <p className="text-[13px] font-semibold text-slate-800">Lists they can edit</p>
        <p className="mb-2 text-[11.5px] text-slate-500">Add, change, hide and delete entries in these lists (publications, awards…).</p>
        <div className="ui-seg mb-2">
          <button type="button" aria-pressed={all} onClick={() => set({ content: 'all' })}>
            All lists
          </button>
          <button type="button" aria-pressed={!all} onClick={() => set({ content: chosen })}>
            Only some
          </button>
        </div>
        {!all && (
          <div className="flex flex-wrap gap-1.5">
            {lists.map(([key, def]) => {
              const on = chosen.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => set({ content: on ? chosen.filter((k) => k !== key) : [...chosen, key] })}
                  className={cx('rounded-full border px-3 py-1 text-[12.5px]', on ? 'border-[#0d7a6f] bg-[#0d7a6f] text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')}
                  aria-pressed={on}
                >
                  {def.label}
                </button>
              );
            })}
            {chosen.length === 0 && <span className="text-[12px] text-amber-700">None selected: they cannot edit any list.</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminCard({ admin, lists }) {
  const [draft, setDraft] = useState(admin);
  const [busy, setBusy] = useState('');
  useEffect(() => setDraft(admin), [admin]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(admin);
  const paused = draft.active === false;

  const save = async (next = draft, msg = 'Access saved') => {
    setBusy('save');
    try {
      const { db, doc, setDoc } = await fs();
      await setDoc(doc(db, 'admins', admin.id), { email: admin.email, name: next.name || '', active: next.active !== false, perms: next.perms, updatedAt: Date.now() });
      toast.success(msg);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  const remove = async () => {
    const ok = await confirmDanger({
      title: 'Remove this admin?',
      message: `${admin.email} will lose all editing access immediately. Their sign-in account itself stays (remove it in Firebase → Authentication if needed).`,
      phrase: admin.email,
      confirmLabel: 'Remove access',
    });
    if (!ok) return;
    try {
      const { db, doc, deleteDoc } = await fs();
      await deleteDoc(doc(db, 'admins', admin.id));
      toast.success('Admin removed');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const sendLink = async () => {
    setBusy('link');
    try {
      const created = await inviteLogin(admin.email);
      toast.success(created ? `Login created. A password link was emailed to ${admin.email}.` : `Password link emailed to ${admin.email}.`);
    } catch (err) {
      toast.error(authError(err));
    } finally {
      setBusy('');
    }
  };

  return (
    <section className={cx('ui-card overflow-hidden', paused && 'opacity-80')}>
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-[13px] font-bold uppercase text-slate-600">{(draft.name || admin.email)[0]}</span>
        <div className="min-w-0 flex-1">
          <input
            className="w-full bg-transparent text-[14px] font-semibold text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="Name (optional)"
            value={draft.name || ''}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            aria-label="Name"
          />
          <p className="truncate text-[12px] text-slate-500">{admin.email}</p>
        </div>
        <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-semibold', paused ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')}>{paused ? 'Paused' : 'Active'}</span>
        <button
          type="button"
          className="ui-btn !py-1"
          onClick={() => save({ ...draft, active: paused }, paused ? 'Access resumed' : 'Access paused')}
          data-tip={paused ? 'Resume|Give their access back.' : 'Pause|Stop their access right away without losing their settings.'}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />} {paused ? 'Resume' : 'Pause'}
        </button>
        <button type="button" className="ui-icon-btn hover:!text-red-600" onClick={remove} aria-label="Remove admin" data-tip="Remove|Take away all their access.">
          <Trash2 size={15} />
        </button>
      </div>
      <div className="px-4 py-4">
        <PermEditor value={draft.perms} onChange={(perms) => setDraft({ ...draft, perms })} lists={lists} />
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2.5">
        <button type="button" className="ui-btn !py-1" onClick={sendLink} disabled={!!busy} data-tip="Password link|Creates their login if it does not exist and emails them a link to set their password.">
          {busy === 'link' ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} Send password link
        </button>
        <span className="ml-auto text-[12px] text-slate-500">{dirty ? 'Unsaved changes' : ''}</span>
        <button type="button" className="ui-btn !py-1" disabled={!dirty} onClick={() => setDraft(admin)}>
          Undo
        </button>
        <button type="button" className="ui-btn ui-btn-accent !py-1" disabled={!dirty || !!busy} onClick={() => save()}>
          {busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save access
        </button>
      </div>
    </section>
  );
}

export default function AccessPanel() {
  const { liveMode, user } = useAdmin();
  const schema = useSchema();
  const lists = Object.entries(schema.collections || {});
  const [admins, setAdmins] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', name: '', invite: true, perms: DEFAULT_ADMIN_PERMS });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!liveMode) return undefined;
    let unsub = () => {};
    let cancelled = false;
    fs()
      .then(({ db, collection, onSnapshot }) => {
        if (cancelled) return;
        unsub = onSnapshot(
          collection(db, 'admins'),
          (snap) => setAdmins(snap.docs.map((d) => ({ id: d.id, ...d.data(), perms: { ...DEFAULT_ADMIN_PERMS, ...(d.data().perms || {}) } })).sort((a, b) => a.email.localeCompare(b.email))),
          (err) => setError(err.code?.includes('permission') ? 'The database rules do not allow this yet. Publish the latest firestore.rules.' : err.message)
        );
      })
      .catch((err) => setError(err.message));
    return () => {
      cancelled = true;
      unsub();
    };
  }, [liveMode]);

  const add = async (e) => {
    e.preventDefault();
    const email = adminDocId(form.email);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast.error('Enter a valid email address.');
    if (SUPER_ADMINS.includes(email)) return toast.error('That is the super admin; they already have full access.');
    if (admins?.some((a) => a.id === email)) return toast.error('That person is already an admin.');
    setAdding(true);
    try {
      const { db, doc, setDoc } = await fs();
      await setDoc(doc(db, 'admins', email), { email, name: form.name.trim(), active: true, perms: form.perms, updatedAt: Date.now() });
      if (form.invite) {
        try {
          const created = await inviteLogin(email);
          toast.success(created ? `Admin added. A password link was emailed to ${email}.` : `Admin added. They already had a login; a password link was emailed.`);
        } catch (err) {
          toast.error(`Admin added, but the login email failed: ${authError(err)}`);
        }
      } else toast.success('Admin added');
      setForm({ email: '', name: '', invite: true, perms: DEFAULT_ADMIN_PERMS });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  if (!liveMode) {
    return (
      <div className="ui-card p-6 text-[13.5px] text-slate-600">
        Admins and permissions need Firebase. Connect the site to Firebase (live mode) to manage who can edit.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-violet-600 text-white">
          <Crown size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-violet-950">Super admin: {SUPER_ADMINS.join(', ')}</p>
          <p className="text-[12.5px] text-violet-900/80">
            Full access, always. Signed in as {user?.email}. Admins only see what you allow below, and never see this page. The database rules enforce the same limits.
          </p>
        </div>
        <ShieldCheck size={20} className="text-violet-500" />
      </section>

      <form onSubmit={add} className="ui-card space-y-4 p-5">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold">
          <UserPlus size={17} /> Add an admin
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="ui-label">Email they sign in with</span>
            <input className="ui-input" type="email" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" />
          </label>
          <label className="block">
            <span className="ui-label">Name (optional)</span>
            <input className="ui-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Tahsina Farah Sanam" />
          </label>
        </div>
        <PermEditor value={form.perms} onChange={(perms) => setForm({ ...form, perms })} lists={lists} />
        <label className="flex items-center gap-2 text-[13px] text-slate-700">
          <input type="checkbox" className="h-4 w-4 accent-[#0d7a6f]" checked={form.invite} onChange={(e) => setForm({ ...form, invite: e.target.checked })} />
          Create their login and email them a link to set a password
        </label>
        <button type="submit" className="ui-btn ui-btn-accent" disabled={adding}>
          {adding ? <Loader2 size={14} className="animate-spin" /> : <MailPlus size={14} />} Add admin
        </button>
      </form>

      {error && <p className="ui-card p-4 text-[13px] text-red-700">{error}</p>}
      {!admins && !error && <p className="text-[13px] text-slate-500">Loading admins…</p>}
      {admins?.length === 0 && <p className="ui-card p-6 text-center text-[13px] text-slate-500">No admins yet. Add one above.</p>}
      {admins?.map((a) => (
        <AdminCard key={a.id} admin={a} lists={lists} />
      ))}
    </div>
  );
}
