'use client';
/**
 * Backups and the Firebase connection: export, import, publish the starting
 * content to Firestore, switch between live and local mode.
 */
import { statusLabel } from '@/components/layout/AdminBar';
import { clearCache, exportData, FIREBASE_CONFIGURED, isForcedLocal, replaceAll, seedSnapshot, setForcedLocal, useStatus } from '@/lib/store';
import { Database, Download, Loader2, RotateCcw, Upload } from 'lucide-react';
import { safeLocalStorage } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

const PENDING = 'tfs:pending-publish';
import toast from 'react-hot-toast';
import { useAdmin } from '@/context/AdminContext';
import { confirmDanger } from '@/components/ui/ConfirmDialog';
import { requirePassword } from '@/components/ui/PasswordGate';

function Row({ title, children, text }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-0 sm:flex-row sm:items-center">
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-[12.5px] text-slate-500">{text}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">{children}</div>
    </div>
  );
}

export default function DataPanel() {
  const status = useStatus();
  const { isSuper, can } = useAdmin();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState('');
  const [pending, setPending] = useState(null);
  const s = statusLabel(status);

  useEffect(() => {
    try {
      const raw = safeLocalStorage()?.getItem(PENDING);
      if (raw) setPending(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const switchMode = () => {
    const goingLive = isForcedLocal();
    // Keep the local edits aside so they can be published once live.
    if (goingLive) safeLocalStorage()?.setItem(PENDING, JSON.stringify(exportData()));
    setForcedLocal(!goingLive);
    window.location.reload();
  };
  const live = status.mode === 'live';
  const emptyParts = Object.entries(status.empty || {}).filter(([, v]) => v).map(([k]) => k);

  const run = async (name, fn, msg) => {
    setBusy(name);
    try {
      await fn();
      if (msg) toast.success(msg);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `site-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.pages || !data.items) throw new Error('This file is not a site backup.');
        confirmDanger({
          title: 'Replace everything with this backup?',
          message: `Every tab, section, list entry and design setting will be replaced by the backup${live ? ', online for all visitors' : ''}. Anything not in the backup is deleted.`,
          note: 'Download a backup of the current site first if you are not sure.',
          phrase: 'REPLACE',
          confirmLabel: 'Replace everything',
        })
          .then((ok) => ok && requirePassword({ title: 'Confirm with your password', message: 'Restoring a backup permanently deletes content that is not in the backup.', confirmLabel: 'Restore backup' }))
          .then((ok) => ok && run('import', () => replaceAll(data), 'Backup restored'));
      } catch (err) {
        toast.error(err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-5">
      <section className="ui-card p-5">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold">
          <Database size={16} /> Connection
        </h3>
        <p className="mt-2 text-[13.5px]">{s.text}</p>
        <ul className="mt-2 space-y-0.5 text-[12.5px] text-slate-500">
          <li>Firebase configured: {FIREBASE_CONFIGURED ? 'yes' : 'no (add the keys in .env.local or your host)'}</li>
          <li>Content shown from: {status.source === 'live' ? 'Firebase' : status.source === 'cache' ? 'the copy saved in this browser' : 'the content bundled with the site'}</li>
          {status.lastSync && <li>Last update from Firebase: {new Date(status.lastSync).toLocaleTimeString()}</li>}
          {live && emptyParts.length > 0 && <li className="text-amber-700">Not yet in Firebase: {emptyParts.join(', ')}. Use “Publish” below.</li>}
        </ul>
      </section>

      <section className="ui-card px-5">
        {isSuper && live && pending && (
          <Row title="Publish your local edits" text={`Edits made in local mode on ${new Date(pending.exportedAt).toLocaleString()} are waiting. Publishing replaces what is in Firebase.`}>
            <button
              type="button"
              className="ui-btn ui-btn-accent"
              disabled={!!busy}
              onClick={() =>
                run('pending', async () => {
                  await replaceAll(pending);
                  safeLocalStorage()?.removeItem(PENDING);
                  setPending(null);
                }, 'Local edits published')
              }
            >
              Publish local edits
            </button>
            <button type="button" className="ui-btn" onClick={() => (safeLocalStorage()?.removeItem(PENDING), setPending(null))}>
              Discard
            </button>
          </Row>
        )}
        {isSuper && live && (
          <Row title="Publish to Firebase" text="Writes everything currently shown (including the starting content) to Firestore. Do this once after connecting a new project.">
            <button type="button" className="ui-btn ui-btn-accent" disabled={!!busy} onClick={() => window.confirm('Write all current content to Firebase?') && run('publish', () => replaceAll(exportData()), 'Published to Firebase')}>
              {busy === 'publish' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Publish
            </button>
          </Row>
        )}
        {can('backup') && <Row title="Download a backup" text="Everything: design, tabs, sections and content, as one JSON file.">
          <button type="button" className="ui-btn" onClick={download}>
            <Download size={14} /> Download
          </button>
        </Row>}
        {isSuper && <Row title="Restore from a backup" text="Replaces all content with a downloaded backup file.">
          <button type="button" className="ui-btn" disabled={!!busy} onClick={() => fileRef.current?.click()}>
            {busy === 'import' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Choose file
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => importFile(e.target.files?.[0])} />
        </Row>}
        {isSuper && <Row title="Reset to the starting content" text="Restores the content bundled with the site. Download a backup first.">
          <button type="button" className="ui-btn ui-btn-danger" disabled={!!busy} onClick={async () => (await confirmDanger({ title: 'Reset to the starting content?', message: 'All your edits to tabs, sections, lists and design are replaced by the original content.', note: 'Download a backup first if you might want your edits back.', phrase: 'RESET', confirmLabel: 'Continue' })) && (await requirePassword({ title: 'Confirm with your password', message: 'Resetting permanently replaces all your content.', confirmLabel: 'Reset everything' })) && run('reset', () => replaceAll(seedSnapshot()), 'Starting content restored')}>
            <RotateCcw size={14} /> Reset
          </button>
        </Row>}
        <Row title="Clear this browser’s saved copy" text="The site keeps a copy so it works when Firebase is unreachable. Clearing it reloads fresh content.">
          <button type="button" className="ui-btn" onClick={() => (clearCache(), window.location.reload())}>
            Clear and reload
          </button>
        </Row>
        {isSuper && FIREBASE_CONFIGURED && (
          <Row
            title={isForcedLocal() ? 'Local mode is on' : 'Work locally'}
            text={isForcedLocal() ? 'Edits are stored in this browser only. Switch back, then use Publish to send them to Firebase.' : 'Edit without touching the live site. Your changes stay in this browser until you publish them.'}
          >
            <button type="button" className="ui-btn" onClick={switchMode}>
              {isForcedLocal() ? 'Switch to live' : 'Switch to local'}
            </button>
          </Row>
        )}
      </section>
    </div>
  );
}
