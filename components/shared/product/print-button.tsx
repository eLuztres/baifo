import Link from 'next/link';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PrintButtonProps {
  slug: string;
  label: string;
  className?: string;
}

/** Opens the listing as an A4 page to print or save as a PDF. */
export default function PrintButton({ slug, label, className }: PrintButtonProps) {
  return (
    <Button asChild variant='ghost' size='icon' className={cn('size-10 shrink-0 rounded-full text-muted-foreground hover:text-primary', className)}>
      <Link href={`/imprimir/${slug}`} aria-label={label} title={label} prefetch={false}>
        <Printer className='size-5' />
      </Link>
    </Button>
  );
}
