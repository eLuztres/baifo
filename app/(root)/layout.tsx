import Header from '@/components/shared/header';
import Footer from '@/components/footer';
import GoldLeafBackground from '@/components/shared/gold-leaf-background';
import { BRAND } from '@/lib/brand';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className='isolate flex min-h-screen flex-col overflow-x-clip'>
      {BRAND.hasGoldLeafBackground && <GoldLeafBackground />}
      <Header />
      <main className='wrapper flex-1 pt-8 sm:pt-12'>{children}</main>
      <Footer />
    </div>
  );
}
