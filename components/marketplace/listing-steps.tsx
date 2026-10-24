import { Check } from 'lucide-react';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import { cn } from '@/lib/utils';

interface ListingStepsProps {
  /** 0 photos, 1 AI at work, 2 check and publish. */
  current: number;
  texts: AdminTexts;
}

/** The three steps of a new listing, the same look as the product studio's wizard. */
export default function ListingSteps({ current, texts }: ListingStepsProps) {
  const steps = [texts.stepPhotos, texts.stepAi, texts.stepCheck];
  return (
    <ol className='flex items-center gap-2 text-sm sm:gap-4'>
      {steps.map((label, index) => (
        <li key={label} className='flex items-center gap-2 sm:gap-4'>
          {index > 0 && <span className='h-px w-6 bg-border sm:w-12' />}
          <span aria-current={index === current ? 'step' : undefined} className={cn('flex items-center gap-2', index > current && 'text-muted-foreground')}>
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-full border text-xs',
                index < current && 'border-primary bg-primary text-primary-foreground',
                index === current && 'border-primary text-primary'
              )}
            >
              {index < current ? <Check className='size-3.5' /> : index + 1}
            </span>
            <span className={cn(index !== current && 'hidden sm:inline')}>{label}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
