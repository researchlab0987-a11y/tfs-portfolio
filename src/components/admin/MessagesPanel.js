'use client';
/** Contact form inbox. */
import { removeMessage, updateMessage, watchMessages } from '@/lib/store';
import { cx } from '@/lib/utils';
import { Inbox, Mail, MailOpen, Reply, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { requirePassword } from '@/components/ui/PasswordGate';

const when = (ms) => (ms ? new Date(ms).toLocaleString() : '');

export default function MessagesPanel() {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => watchMessages(setList, (e) => setError(e.message)), [tick]);

  const act = async (fn) => {
    try {
      await fn();
      setTick((t) => t + 1);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (error) return <p className="ui-card p-5 text-red-700">Messages could not be loaded: {error}</p>;
  if (!list) return <p className="text-slate-500">Loading messages…</p>;
  if (!list.length)
    return (
      <div className="ui-card grid place-items-center p-12 text-center text-slate-500">
        <Inbox size={28} />
        <p className="mt-2">No messages yet. Messages sent from Contact sections appear here.</p>
      </div>
    );

  return (
    <ul className="ui-card divide-y divide-slate-100">
      {list.map((m) => {
        const open = openId === m.id;
        return (
          <li key={m.id} className={cx('px-4 py-3', !m.read && 'bg-[#f2faf9]')}>
            <button
              type="button"
              className="flex w-full items-start gap-3 text-left"
              onClick={() => {
                setOpenId(open ? null : m.id);
                if (!m.read) act(() => updateMessage(m.id, { read: true }));
              }}
            >
              {m.read ? <MailOpen size={16} className="mt-0.5 text-slate-400" /> : <Mail size={16} className="mt-0.5 text-[#0d7a6f]" />}
              <span className="min-w-0 flex-1">
                <span className={cx('block truncate', !m.read && 'font-semibold')}>
                  {m.name} <span className="font-normal text-slate-500">&lt;{m.email}&gt;</span>
                </span>
                <span className="block truncate text-[12.5px] text-slate-500">{m.subject || m.message}</span>
              </span>
              <span className="shrink-0 text-[11.5px] text-slate-400">{when(m.createdAt)}</span>
            </button>
            {open && (
              <div className="mt-3 space-y-3 pl-7">
                <p className="whitespace-pre-wrap text-[13.5px] text-slate-800">{m.message}</p>
                <div className="flex gap-2">
                  <a className="ui-btn" href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || 'your message'}`)}`}>
                    <Reply size={14} /> Reply by email
                  </a>
                  <button type="button" className="ui-btn" onClick={() => act(() => updateMessage(m.id, { read: !m.read }))}>
                    Mark {m.read ? 'unread' : 'read'}
                  </button>
                  <button type="button" className="ui-btn ui-btn-danger" onClick={async () => (await requirePassword({ title: 'Delete this message forever?', message: `Enter your password to permanently delete the message from ${m.name || 'this visitor'}.` })) && act(() => removeMessage(m.id))}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
