import { CheckCircle2, ChevronDown, Clock, EyeOff, Archive, type LucideIcon } from 'lucide-react';
import type { AdminListing } from '@/lib/marketplace/admin.actions';
import { statusText, type AdminTexts } from '@/lib/marketplace/admin-texts';
import { cn } from '@/lib/utils';

export type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

interface ListingStatusProps {
  status: AdminListing['status'];
  type: AdminListing['type'];
  saveState: SaveState;
  texts: AdminTexts;
  /** The statuses the listing can move to from here; none: the status is only shown. */
  choices?: AdminListing['status'][];
  onChoose?: (status: AdminListing['status']) => void;
  isPending?: boolean;
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

/** Whether the listing is online, in one line at the top, so the editor never looks live by mistake; a dropdown changes it. */
export default function ListingStatus({ status, type, saveState, texts, choices = [], onChoose, isPending }: ListingStatusProps) {
  const { icon: Icon, hint, tone } = LOOKS[status] ?? DRAFT;
  const saveLabel = { idle: '', saving: texts.saving, saved: texts.savedAll, failed: texts.notSaved }[saveState];

  return (
    <div role='status' className={cn('flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs sm:text-sm', tone)}>
      <Icon className='size-4 shrink-0' aria-hidden />
      <p className='min-w-0 flex-1 leading-snug'>
        {choices.length > 0 && onChoose ? (
          // Native select: on a phone it opens the system's own picker.
          <span className='relative inline-flex align-middle'>
            <select
              aria-label={texts.listingStatusLabel}
              value={status}
              disabled={isPending}
              onChange={(event) => onChoose(event.target.value as AdminListing['status'])}
              className='h-8 cursor-pointer appearance-none rounded-lg border border-border bg-background py-0 pl-2.5 pr-7 font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
            >
              {[status, ...choices].map((choice) => (
                <option key={choice} value={choice}>
                  {statusText(texts, choice, type)}
                </option>
              ))}
            </select>
            <ChevronDown className='pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' aria-hidden />
          </span>
        ) : (
          <span className='font-medium text-foreground'>{statusText(texts, status, type)}</span>
        )}
        <span className='text-muted-foreground'> · {texts[hint]}</span>
      </p>
      {saveLabel && (
        <span className={cn('shrink-0 text-xs', saveState === 'failed' ? 'font-medium text-destructive' : 'text-muted-foreground')}>{saveLabel}</span>
      )}
    </div>
  );
}
