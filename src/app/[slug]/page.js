import PageView from '@/components/page/PageView';
import seed from '@/data/seed';

// Pre-render every bundled tab so links can prefetch them and switching tabs
// is instant. Tabs added later from the dashboard still work: they render on
// demand, and the page itself reads its content from the client-side store.
export function generateStaticParams() {
  return seed.pages.filter((p) => p.id !== 'home').map((p) => ({ slug: p.id }));
}
export const dynamicParams = true;

export function generateMetadata({ params }) {
  const page = seed.pages.find((p) => p.id === params.slug);
  if (!page) return {};
  return { title: page.seo?.title || page.title, description: page.seo?.description || page.header?.subtitle || undefined };
}

export default function TabPage({ params }) {
  return <PageView slug={params.slug} />;
}
