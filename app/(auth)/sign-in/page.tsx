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
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import GoogleSignInButton from '@/components/shared/google-sign-in-button';
import { getT } from '@/lib/i18n-server';

// NextAuth error codes that come from the Google login flow
// (anything else, e.g. MissingCSRF, means the session simply needs a fresh sign-in).
const GOOGLE_ERRORS = new Set([
  'OAuthSignin',
  'OAuthCallback',
  'OAuthCallbackError',
  'OAuthAccountNotLinked',
  'OAuthCreateAccount',
  'AccessDenied',
  'Configuration',
  'Callback',
]);

export const metadata: Metadata = {
  title: 'Sign In',
};

const SignInPage = async (props: {
  searchParams: Promise<{
    callbackUrl: string;
    error?: string;
  }>;
}) => {
  const { callbackUrl, error } = await props.searchParams;
  const { t } = await getT();

  const session = await auth();

  if (session) {
    return redirect(callbackUrl || '/');
  }

  return (
    <div className='w-full max-w-md mx-auto'>
      <Card>
        <CardHeader className='space-y-4'>
          <Link href='/' className='flex-center'>
            <BrandLogo priority className='h-20' />
          </Link>
          <CardTitle className='text-center'>Sign In</CardTitle>
          <CardDescription className='text-center'>
            Sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* NextAuth sends failed OAuth logins back here with ?error=... */}
          {error && (
            <p className='rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-center text-sm text-destructive'>
              {GOOGLE_ERRORS.has(error) ? t('AUTH_GOOGLE_ERROR') : t('AUTH_SIGN_IN_AGAIN')}
            </p>
          )}
          <GoogleSignInButton callbackUrl={callbackUrl} />
          <CredentialsSignInForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default SignInPage;
