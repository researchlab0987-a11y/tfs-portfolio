'use client';
/** A short footer: name and affiliation, profile links, year. */
import Icon from '@/components/ui/Icon';
import { useConfig } from '@/lib/store';

export default function Footer() {
  const config = useConfig();
  const footer = config.footer || {};
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-bg">
      <div className="mx-auto flex max-w-site flex-col gap-3 px-5 py-6 text-sm text-ink2 md:flex-row md:items-center md:justify-between md:px-8">
        <p>
          <span className="text-ink">© {year} {config.person?.honorific} {config.person?.name}</span>
          {footer.line && <span className="block text-muted md:ml-2 md:inline">{footer.line}</span>}
        </p>
        {footer.showSocials !== false && (config.socials || []).length > 0 && (
          <ul className="flex flex-wrap items-center gap-1">
            {(config.socials || []).map((s) => (
              <li key={s.label + s.url}>
                <a
                  href={s.url}
                  target={s.url?.startsWith('mailto:') ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-ink2 hover:text-accent"
                  aria-label={s.label}
                  title={s.label}
                >
                  <Icon name={s.icon} size={15} fallback={null} />
                  <span className="hidden sm:inline">{s.label}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        {footer.note && <p className="text-xs text-muted">{footer.note}</p>}
      </div>
    </footer>
  );
}
