import { Metadata } from 'next';
import ProfileForm from './profile-form';
import { requireUser } from '@/lib/auth-guard';
import { getT } from '@/lib/i18n-server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('USER_PROFILE') };
}

const Profile = async () => {
  const [session, { t }] = await Promise.all([requireUser(), getT()]);

  return (
    <div className='max-w-md mx-auto space-y-4'>
      <h2 className='h2-bold'>{t('USER_PROFILE')}</h2>
      <ProfileForm name={session.user.name} email={session.user.email} />
    </div>
  );
};

export default Profile;
