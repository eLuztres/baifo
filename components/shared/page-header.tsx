import { cn } from '@/lib/utils';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  /** `h2` for a part of a page that already has its own h1 (the one-page home). */
  as?: 'h1' | 'h2';
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  className,
  as: Heading = 'h1',
}: PageHeaderProps) {
  return (
    <div className={cn('max-w-2xl space-y-2 sm:space-y-3', className)}>
      {eyebrow && <p className='eyebrow'>{eyebrow}</p>}
      <Heading className='text-3xl leading-tight sm:text-5xl'>{title}</Heading>
      {description && (
        <p className='text-sm leading-6 text-muted-foreground sm:text-lg sm:leading-7'>
          {description}
        </p>
      )}
    </div>
  );
}
