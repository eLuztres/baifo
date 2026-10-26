import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getUserById } from '@/lib/actions/user.actions';
import UpdateUserForm from './update-user-form';
import { requireAdmin } from '@/lib/auth-guard';
import { canManageUser } from '@/lib/owner';
import { USER_ROLES } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('ADMIN_UPDATE_USER') };
}

const AdminUserUpdatePage = async (props: {
  params: Promise<{
    id: string;
  }>;
}) => {
  const session = await requireAdmin();
  const { id } = await props.params;

  const [{ t }, user] = await Promise.all([getT(), getUserById(id)]);

  // The owner and the other admins are the owner's to edit (OWNER_EMAIL).
  if (!user || !canManageUser(session.user, user)) notFound();

  // Only what the form edits: the address and payment method stay on the server.
  const { name, email, role } = user;

  return (
    <div className='space-y-8 max-w-lg mx-auto'>
      <h1 className='h2-bold'>{t('ADMIN_UPDATE_USER')}</h1>
      <UpdateUserForm user={{ id, name, email, role }} roles={USER_ROLES} />
    </div>
  );
};

export default AdminUserUpdatePage;
