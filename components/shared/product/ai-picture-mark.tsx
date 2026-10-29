import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AiPictureMarkProps {
  /** Says what the mark means, e.g. "Illustrative image": read out and shown on hover. */
  label: string;
  className?: string;
}

/** A small round mark on a picture the AI made, in the same pill style as the price beside it. */
export default function AiPictureMark({ label, className }: AiPictureMarkProps) {
  return (
    <span
      role='img'
      aria-label={label}
      title={label}
      className={cn('inline-grid size-6.5 shrink-0 place-items-center rounded-full bg-background/90 text-primary shadow-sm', className)}
    >
      <Sparkles aria-hidden='true' className='size-3.5' />
    </span>
  );
}
