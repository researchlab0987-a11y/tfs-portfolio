'use client';
/**
 * Safe confirmations for destructive actions.
 *
 *   const ok = await confirmDanger({ title, message, phrase: 'delete', confirmLabel: 'Delete section' });
 *
 * The button stays disabled until the exact phrase is typed (case and extra
 * spaces ignored), so a stray click or Enter can never delete anything.
 * <ConfirmHost /> is mounted once in Providers.
 *
 *   undoToast('Section deleted', () => restore());
 *
 * shows a toast with an Undo button for 8 seconds.
 */
import Modal from '@/components/ui/Modal';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

let show = null; // set by the host
const queue = [];

export function confirmDanger(options) {
  return new Promise((resolve) => {
    const req = { ...options, resolve };
    if (show) show(req);
    else queue.push(req); // host not mounted yet
  });
}

const norm = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();

export function ConfirmHost() {
  const [req, setReq] = useState(null);
  const [text, setText] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    show = (r) => {
      setText('');
      setReq(r);
    };
    if (queue.length) show(queue.shift());
    return () => {
      show = null;
    };
  }, []);

  // The dialog would focus its close button first; the phrase box is what matters.
  useEffect(() => {
    if (!req) return undefined;
    const t = setTimeout(() => document.getElementById('confirm-phrase')?.focus(), 30);
    return () => clearTimeout(t);
  }, [req]);

  const finish = (ok) => {
    req?.resolve(ok);
    setReq(null);
    setText('');
  };

  if (!mounted || !req) return null;
  const phrase = req.phrase || 'delete';
  const ready = norm(text) === norm(phrase);

  return createPortal(
    <Modal
      open
      onClose={() => finish(false)}
      title={req.title || 'Are you sure?'}
      size="sm"
      footer={
        <>
          <button type="button" className="ui-btn" onClick={() => finish(false)}>
            Keep it
          </button>
          <button type="button" className="ui-btn !border-red-600 !bg-red-600 !text-white hover:!bg-red-700 disabled:!opacity-40" disabled={!ready} onClick={() => finish(true)}>
            {req.confirmLabel || 'Delete'}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle size={18} />
        </span>
        <div className="min-w-0 space-y-3 text-[13.5px] text-slate-700">
          {req.message && <p>{req.message}</p>}
          {req.note && <p className="rounded-lg bg-slate-50 px-3 py-2 text-[12.5px] text-slate-600">{req.note}</p>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (ready) finish(true);
            }}
          >
            <label className="ui-label" htmlFor="confirm-phrase">
              To confirm, type <span className="rounded bg-red-50 px-1.5 py-0.5 font-mono text-red-700">{phrase}</span>
            </label>
            <input
              id="confirm-phrase"
              className="ui-input"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={phrase}
            />
          </form>
        </div>
      </div>
    </Modal>,
    document.body
  );
}

/** Toast with an Undo button (8 s). */
export function undoToast(message, onUndo) {
  toast(
    (t) => (
      <span className="ui flex items-center gap-3">
        <span>{message}</span>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-[12px] font-semibold text-white hover:bg-slate-700"
          onClick={async () => {
            toast.dismiss(t.id);
            try {
              await onUndo();
              toast.success('Restored');
            } catch (err) {
              toast.error(err.message || 'Could not undo.');
            }
          }}
        >
          <RotateCcw size={12} /> Undo
        </button>
      </span>
    ),
    { duration: 8000 }
  );
}
