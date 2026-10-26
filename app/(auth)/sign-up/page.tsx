import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { MailCheck } from 'lucide-react';
import BrandLogo from '@/components/shared/brand-logo';
import { redirect } from 'next/navigation';
import SignUpForm from './sign-up-form';
import GoogleSignInButton from '@/components/shared/google-sign-in-button';
import { getT } from '@/lib/i18n-server';
import { getSession } from '@/lib/auth-guard';
import { safeCallbackUrl } from '@/lib/safe-callback-url';
import { APP_NAME, SIGN_UP_BY_INVITE } from '@/lib/constants';
import { findOpenInvite, INVITE_COOKIE } from '@/lib/invites';
import { Button } from '@/components/ui/button';

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
  const [{ t }, session, cookieStore] = await Promise.all([getT(), getSession(), cookies()]);

  if (session) {
    redirect(callbackUrl || '/');
  }
  const hasInvite = !SIGN_UP_BY_INVITE || Boolean(await findOpenInvite(cookieStore.get(INVITE_COOKIE)?.value));

  return (
    <div className='w-full max-w-md mx-auto'>
      <Card>
        <CardHeader className='space-y-4'>
          <Link href='/' className='flex-center'>
            <BrandLogo priority className='h-20' />
          </Link>
          <CardTitle className='text-center'>{t(hasInvite ? 'AUTH_CREATE_ACCOUNT' : 'AUTH_INVITE_ONLY_TITLE')}</CardTitle>
          <CardDescription className='text-center'>
            {hasInvite ? t('AUTH_SIGN_UP_DESCRIPTION') : t('AUTH_INVITE_ONLY_TEXT', { shop: APP_NAME })}
          </CardDescription>
        </CardHeader>
        {hasInvite ? (
          <CardContent className='space-y-4'>
            <GoogleSignInButton callbackUrl={callbackUrl} />
            <SignUpForm callbackUrl={callbackUrl} />
          </CardContent>
        ) : (
          // No form at all: without an invite there is nothing to fill in.
          <CardContent className='flex flex-col items-center gap-4 text-center'>
            <span className='grid size-14 place-items-center rounded-full bg-primary/10 text-primary'>
              <MailCheck className='size-7' aria-hidden />
            </span>
            <Button asChild variant='outline' className='rounded-full'>
              <Link href='/sign-in'>{t('AUTH_HAVE_ACCOUNT')} {t('SIGN_IN')}</Link>
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default SignUpPage;
