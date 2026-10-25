'use client';

import { AlertCircle, Check, Circle, Loader2 } from 'lucide-react';
import type { AdminListing } from '@/lib/marketplace/admin.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import { cn } from '@/lib/utils';

type StepStatus = 'waiting' | 'working' | 'done' | 'failed';

interface AiProgressProps {
  listing: Pick<AdminListing, 'images' | 'title' | 'lastError' | 'status'>;
  texts: AdminTexts;
}

const ICONS: Record<StepStatus, typeof Circle> = { waiting: Circle, working: Loader2, done: Check, failed: AlertCircle };

/** The AI's two jobs and where each stands, so the wait never looks like nothing happens. */
export default function AiProgress({ listing, texts }: AiProgressProps) {
  const hasFailed = Boolean(listing.lastError) && listing.status === 'PROCESSING';
  // The text (with the category) comes first, then the pictures.
  const text: StepStatus = listing.title ? 'done' : hasFailed ? 'failed' : 'working';
  const photos: StepStatus = listing.images.length > 0 ? 'done' : text !== 'done' ? 'waiting' : hasFailed ? 'failed' : 'working';
  const labels: Record<StepStatus, string> = { waiting: texts.aiWaiting, working: texts.aiWorking, done: texts.aiDone, failed: texts.aiFailed };

  return (
    <ol className='grid gap-3 sm:grid-cols-2'>
      {[
        { label: texts.aiText, status: text },
        { label: texts.aiPhotos, status: photos },
      ].map(({ label, status }) => {
        const Icon = ICONS[status];
        return (
          <li key={label} className='flex items-center gap-3 rounded-2xl border border-border bg-card p-4'>
            <span
              className={cn(
                'flex size-9 items-center justify-center rounded-full',
                status === 'done' && 'bg-primary text-primary-foreground',
                status === 'working' && 'bg-primary/10 text-primary',
                status === 'failed' && 'bg-destructive/10 text-destructive',
                status === 'waiting' && 'bg-muted text-muted-foreground'
              )}
            >
              <Icon className={cn('size-4', status === 'working' && 'animate-spin')} />
            </span>
            <span className='flex-1 text-sm font-medium'>{label}</span>
            <span className='text-xs text-muted-foreground'>{labels[status]}</span>
          </li>
        );
      })}
    </ol>
  );
}
