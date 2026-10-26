import { checkCredit } from '@/lib/ai-usage';
import type { TranslationKey } from '@/lib/i18n-core';
import { getT } from '@/lib/i18n-server';
import { cn } from '@/lib/utils';

const BILLING_URL = 'https://platform.openai.com/settings/organization/billing/overview';

type CreditState = Awaited<ReturnType<typeof checkCredit>>;

const TEXTS: Record<CreditState, TranslationKey> = {
  ok: 'ADMIN_AI_STATUS_OK',
  no_credit: 'ADMIN_AI_STATUS_NO_CREDIT',
  invalid_key: 'ADMIN_AI_STATUS_INVALID_KEY',
  not_configured: 'ADMIN_AI_STATUS_NOT_CONFIGURED',
  unknown: 'ADMIN_AI_STATUS_UNKNOWN',
};

/** A tiny test call on every visit: whether the AI works, and a way to top up when it doesn't. */
export default async function CreditStatus() {
  const [state, { t }] = await Promise.all([checkCredit(), getT()]);
  const isBroken = state === 'no_credit' || state === 'invalid_key';

  return (
    <div
      role={isBroken ? 'alert' : 'status'}
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border p-4 text-sm',
        isBroken ? 'border-destructive bg-destructive/10 text-destructive' : 'border-border bg-muted'
      )}
    >
      <span className={cn('size-2.5 shrink-0 rounded-full', state === 'ok' ? 'bg-primary' : isBroken ? 'bg-destructive' : 'bg-muted-foreground')} />
      <p className='flex-1 font-medium'>{t(TEXTS[state])}</p>
      <a href={BILLING_URL} target='_blank' rel='noopener noreferrer' className='underline underline-offset-4'>
        {t(state === 'no_credit' ? 'ADMIN_AI_TOP_UP' : 'ADMIN_AI_BALANCE_LINK')}
      </a>
    </div>
  );
}
