import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/db/prisma';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { requireAdmin } from '@/lib/auth-guard';
import { getLocale } from '@/lib/i18n-server';
import { adminTexts, type AdminTexts } from '@/lib/marketplace/admin-texts';
import { formatCurrency } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  return { title: adminTexts(await getLocale()).paymentsTitle };
}

const methodLabel = (texts: AdminTexts, method: string) => texts[`payMethod_${method}` as keyof AdminTexts] ?? method;

const dateOf = (date: Date) => date.toLocaleString('es-ES', { timeZone: 'Atlantic/Canary', dateStyle: 'short', timeStyle: 'short' });

/** Every listing fee received, for the books: newest first, with the total. */
export default async function PaymentsPage() {
  await requireAdmin();
  const texts = adminTexts(await getLocale());
  const [fees, total] = await Promise.all([
    prisma.listingFee.findMany({ orderBy: { paidAt: 'desc' }, take: 500 }),
    prisma.listingFee.aggregate({ _sum: { amount: true } }),
  ]);

  return (
    <div className='space-y-4'>
      <h1 className='h2-bold'>{texts.paymentsTitle}</h1>
      {fees.length === 0 ? (
        <p className='text-muted-foreground'>{texts.paymentsEmpty}</p>
      ) : (
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{texts.paymentsDate}</TableHead>
                <TableHead>{texts.paymentsListing}</TableHead>
                <TableHead>{texts.paymentsMethod}</TableHead>
                <TableHead>{texts.paymentsBy}</TableHead>
                <TableHead className='text-right'>{texts.paymentsAmount}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees.map((fee) => (
                <TableRow key={fee.id}>
                  <TableCell className='whitespace-nowrap'>{dateOf(fee.paidAt)}</TableCell>
                  <TableCell>
                    {fee.submissionId ? (
                      <Link href={`/admin/listings/${fee.submissionId}`} className='hover:underline'>
                        {fee.title}
                      </Link>
                    ) : (
                      fee.title
                    )}
                    {fee.payCode && <span className='ml-2 font-mono text-xs text-muted-foreground'>{fee.payCode}</span>}
                  </TableCell>
                  <TableCell>{methodLabel(texts, fee.method)}</TableCell>
                  <TableCell className='text-muted-foreground'>{fee.recordedBy ?? '–'}</TableCell>
                  <TableCell className='text-right tabular-nums'>{formatCurrency(fee.amount.toString())}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4}>{texts.paymentsTotal}</TableCell>
                <TableCell className='text-right tabular-nums'>{formatCurrency((total._sum.amount ?? 0).toString())}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </div>
  );
}
