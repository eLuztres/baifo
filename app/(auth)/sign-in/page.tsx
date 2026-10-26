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
import CredentialsSignInForm from './credentials-signin-form';
import { redirect } from 'next/navigation';
import GoogleSignInButton from '@/components/shared/google-sign-in-button';
import { getT } from '@/lib/i18n-server';
import { ADMIN_HOME_PATH, APP_NAME, SHOWCASE_MODE, SIGN_UP_BY_INVITE } from '@/lib/constants';
import { getSession } from '@/lib/auth-guard';
import { safeCallbackUrl } from '@/lib/safe-callback-url';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('SIGN_IN') };
}

const SignInPage = async (props: {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
}) => {
  const searchParams = await props.searchParams;
  // '' when missing or on another site: then everyone lands on their own home.
  const callbackUrl = safeCallbackUrl(searchParams.callbackUrl, '');
  const [{ t }, session] = await Promise.all([getT(), getSession()]);

  if (session) {
    const home = session.user?.role === 'admin' ? ADMIN_HOME_PATH : '/';
    redirect(callbackUrl || home);
  }

  return (
    <div className='w-full max-w-md mx-auto'>
      <Card>
        <CardHeader className='space-y-4'>
          <Link href='/' className='flex-center'>
            <BrandLogo priority className='h-20' />
          </Link>
          <CardTitle className='text-center'>{SHOWCASE_MODE ? t('JOIN_TITLE', { shop: APP_NAME }) : t('SIGN_IN')}</CardTitle>
          <CardDescription className='text-center'>
            {SHOWCASE_MODE ? t('JOIN_DESCRIPTION', { shop: APP_NAME }) : t('AUTH_SIGN_IN_DESCRIPTION')}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Better Auth sends failed Google logins back here with ?error=... */}
          {searchParams.error && (
            <p className='rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-center text-sm text-destructive'>
              {t('AUTH_GOOGLE_ERROR')}
            </p>
          )}
          <GoogleSignInButton callbackUrl={callbackUrl} />
          <CredentialsSignInForm callbackUrl={callbackUrl} canSignUp={!SIGN_UP_BY_INVITE} />
        </CardContent>
      </Card>
    </div>
  );
};

export default SignInPage;
