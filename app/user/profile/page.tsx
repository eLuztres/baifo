import { Metadata } from 'next';
import ProfileForm from './profile-form';
import { requireUser } from '@/lib/auth-guard';
import { getT } from '@/lib/i18n-server';
import { redirect } from 'next/navigation';
import { ADMIN_HOME_PATH } from '@/lib/constants';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('USER_PROFILE') };
}

const Profile = async () => {
  const [session, { t }] = await Promise.all([requireUser(), getT()]);
  if (session.user.role === 'admin') redirect(ADMIN_HOME_PATH);

  return (
    <div className='max-w-md mx-auto space-y-4'>
      <h2 className='h2-bold'>{t('USER_PROFILE')}</h2>
      <ProfileForm name={session.user.name} email={session.user.email} />
    </div>
  );
};

export default Profile;
