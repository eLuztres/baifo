import { CheckCircle2, Clock, EyeOff, Archive, type LucideIcon } from 'lucide-react';
import type { AdminListing } from '@/lib/marketplace/admin.actions';
import { statusText, type AdminTexts } from '@/lib/marketplace/admin-texts';
import { cn } from '@/lib/utils';

export type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

interface ListingStatusProps {
  status: AdminListing['status'];
  type: AdminListing['type'];
  saveState: SaveState;
  texts: AdminTexts;
}

interface StatusLook {
  icon: LucideIcon;
  hint: keyof AdminTexts;
  tone: string;
}

const LOOKS: Partial<Record<AdminListing['status'], StatusLook>> = {
  LIVE: { icon: CheckCircle2, hint: 'stateLive', tone: 'border-primary/30 bg-primary/10 text-primary' },
  AWAITING_PAYMENT: { icon: Clock, hint: 'stateAwaiting', tone: 'border-border bg-card text-muted-foreground' },
  SOLD: { icon: Archive, hint: 'stateGone', tone: 'border-border bg-muted text-muted-foreground' },
  CANCELLED: { icon: Archive, hint: 'stateGone', tone: 'border-border bg-muted text-muted-foreground' },
  FINISHED: { icon: Archive, hint: 'stateGone', tone: 'border-border bg-muted text-muted-foreground' },
  EXPIRED: { icon: Archive, hint: 'stateGone', tone: 'border-border bg-muted text-muted-foreground' },
  REJECTED: { icon: Archive, hint: 'stateGone', tone: 'border-border bg-muted text-muted-foreground' },
  HIDDEN: { icon: EyeOff, hint: 'stateHidden', tone: 'border-border bg-muted text-muted-foreground' },
};
// Everything else (to review, still collecting) is a draft only the admin sees.
const DRAFT: StatusLook = { icon: EyeOff, hint: 'stateDraft', tone: 'border-border bg-card text-muted-foreground' };

/** Whether the listing is online, in one line at the top, so the editor never looks live by mistake. */
export default function ListingStatus({ status, type, saveState, texts }: ListingStatusProps) {
  const { icon: Icon, hint, tone } = LOOKS[status] ?? DRAFT;
  const saveLabel = { idle: '', saving: texts.saving, saved: texts.savedAll, failed: texts.notSaved }[saveState];

  return (
    <div role='status' className={cn('flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs sm:text-sm', tone)}>
      <Icon className='size-4 shrink-0' aria-hidden />
      <p className='min-w-0 flex-1 leading-snug'>
        <span className='font-medium text-foreground'>{statusText(texts, status, type)}</span>
        <span className='text-muted-foreground'> · {texts[hint]}</span>
      </p>
      {saveLabel && (
        <span className={cn('shrink-0 text-xs', saveState === 'failed' ? 'font-medium text-destructive' : 'text-muted-foreground')}>{saveLabel}</span>
      )}
    </div>
  );
}
