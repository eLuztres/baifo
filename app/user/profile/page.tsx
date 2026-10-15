import { Metadata } from 'next';
import { auth } from '@/auth';
import ProfileForm from './profile-form';

export const metadata: Metadata = {
  title: 'Customer Profile',
};

const Profile = async () => {
  const session = await auth();

  return (
    <div className='max-w-md mx-auto space-y-4'>
      <h2 className='h2-bold'>Profile</h2>
      <ProfileForm name={session?.user.name ?? ''} email={session?.user.email ?? ''} />
    </div>
  );
};

export default Profile;
