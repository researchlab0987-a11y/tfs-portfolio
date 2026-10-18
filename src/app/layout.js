import Providers from '@/components/layout/Providers';
import seed from '@/data/seed';
import { fontsHref, themeVars } from '@/lib/themes';
import './globals.css';

const { site, person } = seed.config;

export const metadata = {
  title: { default: site.title, template: `%s | ${site.title}` },
  description: site.description,
  authors: [{ name: `${person.honorific} ${person.name}` }],
  icons: { icon: '/favicon.svg' },
  openGraph: { type: 'website', title: site.title, description: site.description, images: person.photo ? [person.photo] : [] },
  twitter: { card: 'summary', title: site.title, description: site.description },
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  // The bundled theme is written into the HTML so the first paint is already
  // styled; the saved theme replaces it as soon as it loads.
  return (
    <html lang={site.language || 'en'} style={themeVars(seed.config.theme)} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link id="tfs-fonts" rel="stylesheet" href={fontsHref(seed.config.theme.fonts)} />
      </head>
      <body className="flex min-h-screen flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
