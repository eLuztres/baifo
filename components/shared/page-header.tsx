import { cn } from '@/lib/utils';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('max-w-2xl space-y-4', className)}>
      {eyebrow && <p className='eyebrow'>{eyebrow}</p>}
      <h1 className='text-4xl leading-tight sm:text-5xl'>{title}</h1>
      {description && (
        <p className='text-base leading-7 text-muted-foreground sm:text-lg'>
          {description}
        </p>
      )}
    </div>
  );
}
