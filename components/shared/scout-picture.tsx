import ProductMedia from '@/components/ProductMedia';
import { cn } from '@/lib/utils';

interface ScoutPictureProps {
  name: string;
  image: string | null;
  className?: string;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/** A señalador's photo in a circle, or their initials when there is none. */
export default function ScoutPicture({ name, image, className }: ScoutPictureProps) {
  return (
    <span className={cn('relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-medium text-primary', className)}>
      {image ? <ProductMedia src={image} alt='' fill sizes='6rem' isStill /> : initials(name)}
    </span>
  );
}
