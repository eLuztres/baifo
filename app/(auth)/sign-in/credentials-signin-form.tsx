'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signInDefaultValues } from '@/lib/constants/form-defaults';
import Link from 'next/link';
import { useActionState } from 'react';
import { signInWithCredentials } from '@/lib/actions/user.actions';
import { useI18n, useTranslateMessage } from '@/components/i18n-provider';
import SubmitButton from '../submit-button';

interface CredentialsSignInFormProps {
  /** Where to go after signing in, already checked to be on this site ('' for the visitor's home). */
  callbackUrl: string;
  /** Invite-only shops: nobody can sign up from here. */
  canSignUp: boolean;
}

const CredentialsSignInForm = ({ callbackUrl, canSignUp }: CredentialsSignInFormProps) => {
  const { t } = useI18n();
  const translateMessage = useTranslateMessage();
  const [data, action] = useActionState(signInWithCredentials, {
    success: false,
    message: '',
  });

  return (
    <form action={action}>
      <input type='hidden' name='callbackUrl' value={callbackUrl} />
      <div className='space-y-6'>
        <div>
          <Label htmlFor='email'>{t('FIELD_EMAIL')}</Label>
          <Input
            id='email'
            name='email'
            type='email'
            required
            autoComplete='email'
            defaultValue={signInDefaultValues.email}
          />
        </div>
        <div>
          <Label htmlFor='password'>{t('FIELD_PASSWORD')}</Label>
          <Input
            id='password'
            name='password'
            type='password'
            required
            autoComplete='current-password'
            defaultValue={signInDefaultValues.password}
          />
        </div>
        <div>
          <SubmitButton label={t('SIGN_IN')} pendingLabel={t('AUTH_SIGNING_IN')} />
        </div>

        {data && !data.success && (
          <div className='text-center text-destructive'>{translateMessage(data.message)}</div>
        )}

        {canSignUp && (
          <div className='text-sm text-center text-muted-foreground'>
            {t('AUTH_NO_ACCOUNT')}{' '}
            <Link
              href={callbackUrl ? `/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/sign-up'}
              target='_self'
              className='link'
            >
              {t('AUTH_SIGN_UP')}
            </Link>
          </div>
        )}
      </div>
    </form>
  );
};

export default CredentialsSignInForm;
