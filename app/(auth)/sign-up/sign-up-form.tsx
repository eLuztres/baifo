'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useActionState, useState } from 'react';
import { signUpUser } from '@/lib/actions/user.actions';
import { useI18n, useTranslateMessage } from '@/components/i18n-provider';
import SubmitButton from '../submit-button';

interface SignUpFormProps {
  /** Where to go after signing up, already checked to be on this site ('' for the home page). */
  callbackUrl: string;
}

const SignUpForm = ({ callbackUrl }: SignUpFormProps) => {
  const { t } = useI18n();
  const translateMessage = useTranslateMessage();
  const [data, action] = useActionState(signUpUser, {
    success: false,
    message: '',
  });

  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form action={action}>
      <input type='hidden' name='callbackUrl' value={callbackUrl} />
      <div className='space-y-6'>
        <div>
          <Label htmlFor='name'>{t('FIELD_NAME')}</Label>
          <Input
            id='name'
            name='name'
            type='text'
            autoComplete='name'
            defaultValue={formValues.name}
            onChange={handleChange}

          />
        </div>
        <div>
          <Label htmlFor='email'>{t('FIELD_EMAIL')}</Label>
          <Input
            id='email'
            name='email'
            type='text'
            autoComplete='email'
            defaultValue={formValues.email}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor='password'>{t('FIELD_PASSWORD')}</Label>
          <Input
            id='password'
            name='password'
            type='password'
            required
            autoComplete='new-password'
            defaultValue={formValues.password}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor='confirmPassword'>{t('FIELD_CONFIRM_PASSWORD')}</Label>
          <Input
            id='confirmPassword'
            name='confirmPassword'
            type='password'
            required
            autoComplete='new-password'
            defaultValue={formValues.confirmPassword}
            onChange={handleChange}
          />
        </div>
        <div>
          <SubmitButton label={t('AUTH_SIGN_UP')} pendingLabel={t('AUTH_SIGNING_UP')} />
        </div>

        {data && !data.success && (
          <div className='text-center text-destructive'>{translateMessage(data.message)}</div>
        )}

        <div className='text-sm text-center text-muted-foreground'>
          {t('AUTH_HAVE_ACCOUNT')}{' '}
          <Link
            href={callbackUrl ? `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/sign-in'}
            target='_self'
            className='link'
          >
            {t('SIGN_IN')}
          </Link>
        </div>
      </div>
    </form>
  );
};

export default SignUpForm;
