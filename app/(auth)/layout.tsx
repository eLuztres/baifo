export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className='flex-center min-h-screen w-full bg-gradient-to-b from-primary/15 to-background px-4 py-12'>
      {children}
    </div>
  );
}
