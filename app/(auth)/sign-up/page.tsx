import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Metadata } from 'next';
import Link from 'next/link';
import BrandLogo from '@/components/shared/brand-logo';
import { redirect } from 'next/navigation';
import SignUpForm from './sign-up-form';
import GoogleSignInButton from '@/components/shared/google-sign-in-button';
import { getT } from '@/lib/i18n-server';
import { getSession } from '@/lib/auth-guard';
import { safeCallbackUrl } from '@/lib/safe-callback-url';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('AUTH_CREATE_ACCOUNT') };
}

const SignUpPage = async (props: {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
}) => {
  // '' when missing or on another site.
  const callbackUrl = safeCallbackUrl((await props.searchParams).callbackUrl, '');
  const [{ t }, session] = await Promise.all([getT(), getSession()]);

  if (session) {
    redirect(callbackUrl || '/');
  }

  return (
    <div className='w-full max-w-md mx-auto'>
      <Card>
        <CardHeader className='space-y-4'>
          <Link href='/' className='flex-center'>
            <BrandLogo priority className='h-20' />
          </Link>
          <CardTitle className='text-center'>{t('AUTH_CREATE_ACCOUNT')}</CardTitle>
          <CardDescription className='text-center'>
            {t('AUTH_SIGN_UP_DESCRIPTION')}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <GoogleSignInButton callbackUrl={callbackUrl} />
          <SignUpForm callbackUrl={callbackUrl} />
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUpPage;
