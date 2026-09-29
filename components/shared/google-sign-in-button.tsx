import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '@/components/ui/button';
import { signInWithGoogle } from '@/lib/actions/user.actions';
import { getT } from '@/lib/i18n-server';
import { GOOGLE_AUTH_ENABLED } from '@/lib/constants';

/** "Continue with Google" button plus an "or" divider above the email form. */
export default async function GoogleSignInButton({
  callbackUrl,
}: {
  callbackUrl?: string;
}) {
  if (!GOOGLE_AUTH_ENABLED) return null;
  const { t } = await getT();

  return (
    <div className='space-y-6'>
      <form action={signInWithGoogle}>
        <input type='hidden' name='callbackUrl' value={callbackUrl || '/'} />
        <Button type='submit' variant='outline' size='lg' className='w-full rounded-full'>
          <FontAwesomeIcon icon={faGoogle} className='h-4 w-4' />
          {t('SIGN_IN_WITH_GOOGLE')}
        </Button>
      </form>

      <div className='flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-muted-foreground'>
        <span className='h-px flex-1 bg-border' />
        {t('AUTH_OR')}
        <span className='h-px flex-1 bg-border' />
      </div>
    </div>
  );
}
