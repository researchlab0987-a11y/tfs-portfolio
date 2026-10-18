'use client';
/** Markdown with internal links routed through Next and external ones in a new tab. */
import { cx, isExternal } from '@/lib/utils';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components = {
  a: ({ href = '', children }) => {
    if (href.startsWith('/') && !href.startsWith('//')) return <Link href={href}>{children}</Link>;
    if (href.startsWith('#')) return <a href={href}>{children}</a>;
    return (
      <a href={href} target={isExternal(href) && !href.startsWith('mailto:') ? '_blank' : undefined} rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  // eslint-disable-next-line @next/next/no-img-element
  img: ({ src, alt }) => <img src={src} alt={alt || ''} loading="lazy" referrerPolicy="no-referrer" />,
};

export default function Markdown({ children, className = '', inline = false }) {
  const text = String(children ?? '');
  if (!text.trim()) return null;
  if (inline) {
    return (
      <span className={cx('md md-inline', className)}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ ...components, p: ({ children: c }) => <>{c}</> }}>
          {text}
        </ReactMarkdown>
      </span>
    );
  }
  return (
    <div className={cx('md', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
