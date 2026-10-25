import { Check } from 'lucide-react';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import { cn } from '@/lib/utils';

interface ListingStepsProps {
  /** 0 tell me everything, 1 category, 2 check and publish. */
  current: number;
  texts: AdminTexts;
}

/** Where the admin is in creating a listing: three steps, the current one named. */
export default function ListingSteps({ current, texts }: ListingStepsProps) {
  const steps = [texts.stepTell, texts.stepCategory, texts.stepCheck];
  return (
    <ol className='mx-auto flex w-full max-w-xl items-center justify-center gap-2 text-sm'>
      {steps.map((label, index) => (
        <li key={label} className='flex items-center gap-2'>
          {index > 0 && <span className={cn('h-px w-6 sm:w-10', index <= current ? 'bg-primary' : 'bg-border')} aria-hidden />}
          <span aria-current={index === current ? 'step' : undefined} className={cn('flex items-center gap-2', index > current && 'text-muted-foreground')}>
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs',
                index < current && 'border-primary bg-primary text-primary-foreground',
                index === current && 'border-primary font-medium text-primary'
              )}
            >
              {index < current ? <Check className='size-3.5' /> : index + 1}
            </span>
            <span className={cn(index !== current && 'hidden sm:inline', index === current && 'font-medium')}>{label}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
