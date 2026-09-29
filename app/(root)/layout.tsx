import Header from '@/components/shared/header';
import Footer from '@/components/footer';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className='flex min-h-screen flex-col overflow-x-clip'>
      <Header />
      <main className='wrapper flex-1 pt-8 sm:pt-12'>{children}</main>
      <Footer />
    </div>
  );
}
