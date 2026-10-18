'use client';
import AddSectionDialog from '@/components/editor/AddSectionDialog';
import ItemEditor from '@/components/editor/ItemEditor';
import PageSettingsDialog from '@/components/editor/PageSettings';
import SectionEditor from '@/components/editor/SectionEditor';
import Drawer from '@/components/drawer/Drawer';
import { AdminProvider } from '@/context/AdminContext';
import { DrawerProvider } from '@/context/DrawerContext';
import { useConfig } from '@/lib/store';
import { usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import TooltipLayer from '@/components/ui/TooltipLayer';
import { ConfirmHost } from '@/components/ui/ConfirmDialog';
import { PasswordHost } from '@/components/ui/PasswordGate';
import AdminBar from './AdminBar';
import Boot from './Boot';
import CursorFx from './CursorFx';
import Footer from './Footer';
import Navbar from './Navbar';
import NavProgress from './NavProgress';

export default function Providers({ children }) {
  const config = useConfig();
  // The dashboard is a full-screen app with its own sidebar: no site menu or footer.
  const dashboard = (usePathname() || '').startsWith('/admin');
  return (
    <AdminProvider>
      <DrawerProvider defaultWidth={Number(config.drawer?.width) || 75}>
        <Boot />
        <NavProgress />
        {!dashboard && <Navbar />}
        <main id="main" className="flex-1">
          {children}
        </main>
        {!dashboard && <Footer />}
        <Drawer />
        <SectionEditor />
        <AddSectionDialog />
        <ItemEditor />
        <PageSettingsDialog />
        <AdminBar />
        <CursorFx />
        <TooltipLayer />
        <ConfirmHost />
        <PasswordHost />
        <Toaster position="bottom-center" toastOptions={{ style: { fontSize: 14 } }} containerStyle={{ bottom: 72 }} />
      </DrawerProvider>
    </AdminProvider>
  );
}
