import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { requireAdmin } from '@/lib/auth-guard';

// Every listing is edited in the listing editor; older links to the product form land there.
const AdminProductPage = async (props: { params: Promise<{ id: string }> }) => {
  await requireAdmin();
  const { id } = await props.params;
  const listing = await prisma.submission.findFirst({ where: { productId: id }, select: { id: true } });
  if (!listing) notFound();
  redirect(`/admin/listings/${listing.id}`);
};

export default AdminProductPage;
