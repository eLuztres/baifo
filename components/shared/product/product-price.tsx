import { cn, formatPriceOrRange } from '@/lib/utils';

const ProductPrice = ({
  value,
  maxValue,
  label,
  className,
}: {
  value: number;
  /** The upper end of a wanted ad's budget: shown as a range. */
  maxValue?: string | null;
  /** Said before the price, e.g. "Budget" on a wanted ad. */
  label?: string;
  className?: string;
}) => {
  return (
    <p className={cn('text-2xl font-semibold tabular-nums', className)}>
      {label && <span className='mr-1.5 text-[0.6em] font-normal text-muted-foreground'>{label}</span>}
      {formatPriceOrRange(value, maxValue)}
    </p>
  );
};

export default ProductPrice;
