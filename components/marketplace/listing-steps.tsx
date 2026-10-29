import type { ReactNode } from 'react';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import { cn } from '@/lib/utils';

interface ListingStepsProps {
  /** 0 photos, 1 description (and the listing to publish). */
  current: number;
  texts: AdminTexts;
  /** Set while the admin may go back and forth: the other step becomes a button. */
  onSelect?: (index: number) => void;
}

/** Where the admin is in creating a listing: photos, then the description. */
export default function ListingSteps({ current, texts, onSelect }: ListingStepsProps) {
  const steps = [texts.stepPhotos, texts.stepDetails];
  return (
    <ol className='mx-auto flex w-full max-w-xl items-center justify-center gap-2 text-sm'>
      {steps.map((label, index) => (
        <li key={label} className='flex items-center gap-2'>
          {index > 0 && <span className='h-px w-6 bg-border sm:w-10' aria-hidden />}
          <StepLink
            onClick={onSelect && index !== current ? () => onSelect(index) : undefined}
            aria-current={index === current ? 'step' : undefined}
            className={cn('flex items-center gap-2', index !== current && 'text-muted-foreground')}
          >
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs',
                index === current ? 'border-primary bg-primary font-semibold text-primary-foreground' : 'border-border'
              )}
            >
              {index + 1}
            </span>
            <span className={cn(index === current && 'font-semibold')}>{label}</span>
          </StepLink>
        </li>
      ))}
    </ol>
  );
}

interface StepLinkProps {
  onClick?: () => void;
  className: string;
  'aria-current'?: 'step';
  children: ReactNode;
}

/** A step the admin can jump to is a button; the others are plain text. */
function StepLink({ onClick, className, ...props }: StepLinkProps) {
  if (!onClick) return <span className={className} {...props} />;
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(className, 'rounded-full underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
      {...props}
    />
  );
}
