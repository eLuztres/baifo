import Header from '@/components/shared/header';
import Footer from '@/components/footer';
import ServiceAreaNotice from '@/components/shared/service-area-notice';
import AdminAddButton from '@/components/shared/admin-add-button';
import GoldLeafBackground from '@/components/shared/gold-leaf-background';
import DunesBackground from '@/components/shared/dunes-background';
import HomeOffers from '@/components/shared/offers/home-offers';
import RefreshOnReturn from '@/components/shared/refresh-on-return';
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
      <ServiceAreaNotice />
      <Header />
      <main className='wrapper flex-1 pt-8 sm:pt-12'>{children}</main>
      <Footer />
      <AdminAddButton />
      <HomeOffers />
      <RefreshOnReturn />
      {/* Fetched with the first page: on mobile data the loader's own picture otherwise arrives after the page it waits for. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- only warms the cache for the loader */}
      {[BRAND.loaderImage, BRAND.loaderImageDark].map((src) => src && <img key={src} src={src} alt='' hidden />)}
    </div>
  );
}
