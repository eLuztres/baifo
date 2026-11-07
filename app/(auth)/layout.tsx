import LanguageSwitcher from '@/components/shared/header/language-switcher';

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className='flex-center relative min-h-screen w-full bg-gradient-to-b from-primary/15 to-background px-4 py-12'>
      {/* The languages are one tap away here too, before signing in. */}
      <LanguageSwitcher variant='compact' className='absolute right-4 top-4 h-10 gap-2 pr-3 text-sm' />
      {children}
    </div>
  );
}
