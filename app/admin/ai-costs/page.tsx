import { Metadata } from 'next';
import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CreditStatus from './credit-status';
import { getAiCostSummary, type AiUsageKind } from '@/lib/ai-usage';
import { requireAdmin } from '@/lib/auth-guard';
import type { TranslationKey } from '@/lib/i18n-core';
import { getT } from '@/lib/i18n-server';
import { formatDateTime, formatNumber } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('ADMIN_AI_COSTS') };
}

const KIND_LABELS: Record<AiUsageKind, TranslationKey> = {
  picture: 'ADMIN_AI_KIND_PICTURE',
  text: 'ADMIN_AI_KIND_TEXT',
  voice: 'ADMIN_AI_KIND_VOICE',
  check: 'ADMIN_AI_KIND_CHECK',
};

const kindLabel = (kind: string) => KIND_LABELS[kind as AiUsageKind] ?? 'ADMIN_AI_KIND_TEXT';

/** Every saved OpenAI call summed up, and whether there is credit left (a test call on opening). */
export default async function AdminAiCostsPage() {
  await requireAdmin();
  const [{ t, locale }, summary] = await Promise.all([getT(), getAiCostSummary()]);
  // OpenAI bills in dollars; single calls cost fractions of a cent, so they get more digits.
  const usd = (amount: number, digits = 2) =>
    amount.toLocaleString(locale, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: digits });

  const totals = [
    { label: t('ADMIN_AI_TODAY'), ...summary.today },
    { label: t('ADMIN_AI_THIS_MONTH'), ...summary.month },
    { label: t('ADMIN_AI_LAST_30_DAYS'), ...summary.last30Days },
    { label: t('ADMIN_AI_ALL_TIME'), ...summary.allTime },
  ];

  return (
    <div className='space-y-6'>
      <div className='space-y-1'>
        <h1 className='h2-bold'>{t('ADMIN_AI_COSTS')}</h1>
        <p className='text-sm text-muted-foreground'>{t('ADMIN_AI_COSTS_INTRO')}</p>
      </div>

      <Suspense fallback={<p className='rounded-xl border border-border bg-muted p-4 text-sm'>{t('ADMIN_AI_STATUS_CHECKING')}</p>}>
        <CreditStatus />
      </Suspense>

      <div className='grid gap-4 grid-cols-2 lg:grid-cols-4'>
        {totals.map(({ label, cost, calls }) => (
          <Card key={label}>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium'>{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-2xl font-bold'>{usd(cost)}</p>
              <p className='text-xs text-muted-foreground'>{t('ADMIN_AI_CALLS', { count: formatNumber(calls) })}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {summary.byKind.length > 0 && (
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>{t('ADMIN_AI_BY_KIND')}</CardTitle>
          </CardHeader>
          <CardContent className='flex flex-wrap gap-x-8 gap-y-2'>
            {summary.byKind.map(({ kind, cost, calls }) => (
              <p key={kind} className='text-sm'>
                <span className='font-medium'>{t(kindLabel(kind))}</span>: {usd(cost)}{' '}
                <span className='text-muted-foreground'>({t('ADMIN_AI_CALLS', { count: formatNumber(calls) })})</span>
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className='space-y-2'>
        <h2 className='h3-bold'>{t('ADMIN_AI_LATEST')}</h2>
        {summary.latest.length === 0 ? (
          <p className='text-sm text-muted-foreground'>{t('ADMIN_AI_EMPTY')}</p>
        ) : (
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ADMIN_AI_FIELD_TIME')}</TableHead>
                  <TableHead>{t('ADMIN_AI_FIELD_KIND')}</TableHead>
                  <TableHead>{t('ADMIN_AI_FIELD_MODEL')}</TableHead>
                  <TableHead className='text-right'>{t('ADMIN_AI_FIELD_TOKENS')}</TableHead>
                  <TableHead className='text-right'>{t('ADMIN_AI_FIELD_COST')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.latest.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>{formatDateTime(call.createdAt).dateTime}</TableCell>
                    <TableCell>{t(kindLabel(call.kind))}</TableCell>
                    <TableCell className='font-mono text-xs'>{call.model}</TableCell>
                    <TableCell className='text-right'>
                      {formatNumber(call.inputTokens)} / {formatNumber(call.outputTokens)}
                    </TableCell>
                    <TableCell className='text-right'>
                      {call.isPriced ? usd(call.costUsd, 4) : <span className='text-muted-foreground'>{t('ADMIN_AI_PRICE_UNKNOWN')}</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
