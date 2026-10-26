import { Metadata } from 'next';
import { getAllUsers, deleteUser } from '@/lib/actions/user.actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatId } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Pagination from '@/components/shared/pagination';
import { Badge } from '@/components/ui/badge';
import DeleteDialog from '@/components/shared/delete-dialog';
import FilterNotice from '@/components/admin/filter-notice';
import { roleLabel } from '@/components/admin/role-label';
import { requireAdmin } from '@/lib/auth-guard';
import { canManageUser, isOwner } from '@/lib/owner';
import { getT } from '@/lib/i18n-server';
import { SIGN_UP_BY_INVITE } from '@/lib/constants';
import { getOpenInvites, INVITE_DAYS } from '@/lib/invites';
import InviteLinks from '@/components/admin/invite-links';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('ADMIN_USERS') };
}

const AdminUserPage = async (props: {
  searchParams: Promise<{
    page?: string;
    query?: string;
  }>;
}) => {
  const session = await requireAdmin();

  const { page: pageParam, query: searchText } = await props.searchParams;
  const page = Number(pageParam) || 1;

  const [{ t }, users, invites] = await Promise.all([
    getT(),
    getAllUsers({ page, query: searchText ?? '' }),
    SIGN_UP_BY_INVITE ? getOpenInvites() : null,
  ]);

  return (
    <div className='space-y-2'>
      <div className='flex items-center gap-3'>
        <h1 className='h2-bold'>{t('ADMIN_USERS')}</h1>
        <FilterNotice query={searchText} clearHref='/admin/users' />
      </div>
      {invites && <InviteLinks invites={invites} days={INVITE_DAYS} />}
      <div className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow className='uppercase'>
              <TableHead>{t('FIELD_ID')}</TableHead>
              <TableHead>{t('FIELD_NAME')}</TableHead>
              <TableHead>{t('FIELD_EMAIL')}</TableHead>
              <TableHead>{t('FIELD_ROLE')}</TableHead>
              <TableHead>{t('FIELD_ACTIONS')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.data.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{formatId(user.id)}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {isOwner(user) ? t('ADMIN_USER_OWNER') : roleLabel(t, user.role)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {canManageUser(session.user, user) && (
                    <>
                      <Button asChild variant='outline' size='sm'>
                        <Link href={`/admin/users/${user.id}`}>{t('ADMIN_EDIT')}</Link>
                      </Button>
                      <DeleteDialog id={user.id} action={deleteUser} />
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {users.totalPages > 1 && (
          <Pagination page={page} totalPages={users.totalPages} />
        )}
      </div>
    </div>
  );
};

export default AdminUserPage;
