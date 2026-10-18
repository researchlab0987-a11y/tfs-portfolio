'use client';
/**
 * Contact details, a message form and a map.
 *
 * Messages go to Firestore. If that fails (offline, rules, quota) the visitor
 * is offered an email link with their message already filled in, so nothing
 * typed is lost.
 */
import Icon from '@/components/ui/Icon';
import Markdown from '@/components/ui/Markdown';
import { sendMessage, useConfig } from '@/lib/store';
import { cx } from '@/lib/utils';
import { Loader2, Mail, MapPin, Phone, Send, Clock } from 'lucide-react';
import { useRef, useState } from 'react';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.88rem] font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

const inputCls = 'w-full rounded-[calc(var(--radius)*0.6)] border border-line bg-card px-3.5 py-2.5 text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20';

export default function ContactSection({ section }) {
  const p = section.props;
  const config = useConfig();
  const c = config.contact || {};
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', website: '' });
  const [state, setState] = useState('idle'); // idle | sending | sent | failed
  const lastSent = useRef(0);

  const mailto = `mailto:${c.email}?subject=${encodeURIComponent(form.subject || 'Message from your website')}&body=${encodeURIComponent(`${form.message}\n\n${form.name}\n${form.email}`)}`;

  const submit = async (e) => {
    e.preventDefault();
    if (form.website) return; // bots fill the hidden field
    if (Date.now() - lastSent.current < 30000) return setState('wait');
    setState('sending');
    try {
      await sendMessage(form);
      lastSent.current = Date.now();
      setState('sent');
      setForm({ name: '', email: '', subject: '', message: '', website: '' });
    } catch {
      setState('failed');
    }
  };

  const details = [
    c.address && { icon: MapPin, label: 'Address', value: c.address },
    c.email && { icon: Mail, label: 'Email', value: c.email, href: `mailto:${c.email}` },
    c.phone && { icon: Phone, label: 'Phone', value: c.phone, href: `tel:${c.phone.replace(/\s/g, '')}` },
    c.hours && { icon: Clock, label: 'Office hours', value: c.hours },
  ].filter(Boolean);

  const mapSrc = p.mapUrl || c.mapUrl;
  const split = p.layout === 'split' && p.showForm && (p.showDetails || p.showMap);

  const info = (
    <div className="space-y-8">
      {p.intro && <Markdown className="text-[1.04rem]">{p.intro}</Markdown>}
      {p.showDetails && details.length > 0 && (
        <dl className="space-y-5">
          {details.map((d) => (
            <div key={d.label} className="flex gap-4">
              <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-card text-accent">
                <d.icon size={17} />
              </span>
              <div>
                <dt className="text-[0.82rem] text-muted">{d.label}</dt>
                <dd className="whitespace-pre-line text-ink">
                  {d.href ? (
                    <a className="underline decoration-line underline-offset-4 hover:text-accent" href={d.href}>
                      {d.value}
                    </a>
                  ) : (
                    d.value
                  )}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      )}
      {p.showDetails && (config.socials || []).length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {config.socials.map((s) => (
            <li key={s.url}>
              <a href={s.url} target={s.url?.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[0.85rem] text-ink2 hover:border-accent hover:text-accent">
                <Icon name={s.icon} size={14} /> {s.label}
              </a>
            </li>
          ))}
        </ul>
      )}
      {p.showMap && mapSrc && (
        <div className="overflow-hidden rounded-card border border-line">
          <iframe src={mapSrc} title="Map" className="h-64 w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>
      )}
    </div>
  );

  const formEl = p.showForm && (
    <form onSubmit={submit} className="rounded-card border border-line bg-card p-6 md:p-8" noValidate={false}>
      {p.formTitle && <h3 className="mb-6 font-heading text-[1.45rem] font-medium text-ink">{p.formTitle}</h3>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name">
          <input required maxLength={180} className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
        </Field>
        <Field label="Email">
          <input required type="email" maxLength={180} className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Subject">
          <input maxLength={280} className={inputCls} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Message">
          <textarea required rows={6} maxLength={4800} className={cx(inputCls, 'resize-y')} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </Field>
      </div>
      <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-solid" disabled={state === 'sending'}>
          {state === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {state === 'sending' ? 'Sending…' : 'Send message'}
        </button>
        <p role="status" className="text-[0.92rem]">
          {state === 'sent' && <span className="text-accent">{p.successText}</span>}
          {state === 'wait' && <span className="text-ink2">Please wait a moment before sending another message.</span>}
          {state === 'failed' && (
            <span className="text-ink2">
              The message could not be sent from here.{' '}
              {c.email && (
                <a className="font-semibold text-accent underline underline-offset-4" href={mailto}>
                  Send it by email instead
                </a>
              )}
            </span>
          )}
        </p>
      </div>
    </form>
  );

  if (split) {
    return (
      <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {info}
        {formEl}
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl space-y-12">
      {info}
      {formEl}
    </div>
  );
}
