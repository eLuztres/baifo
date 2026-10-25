import Header from '@/components/shared/header';
import Footer from '@/components/footer';
import AdminAddButton from '@/components/shared/admin-add-button';
import GoldLeafBackground from '@/components/shared/gold-leaf-background';
import DunesBackground from '@/components/shared/dunes-background';
import { BRAND } from '@/lib/brand';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className='isolate flex min-h-screen flex-col overflow-x-clip'>
      {BRAND.hasGoldLeafBackground && <GoldLeafBackground />}
      {BRAND.hasDunesBackground && <DunesBackground />}
      <Header />
      <main className='wrapper flex-1 pt-8 sm:pt-12'>{children}</main>
      <Footer />
      <AdminAddButton />
    </div>
  );
}
