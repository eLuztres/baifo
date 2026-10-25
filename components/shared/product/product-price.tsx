import { cn, formatCurrency } from '@/lib/utils';

const ProductPrice = ({
  value,
  label,
  className,
}: {
  value: number;
  /** Said before the price, e.g. "Budget" on a wanted ad. */
  label?: string;
  className?: string;
}) => {
  return (
    <p className={cn('text-2xl font-semibold tabular-nums', className)}>
      {label && <span className='mr-1.5 text-[0.6em] font-normal text-muted-foreground'>{label}</span>}
      {formatCurrency(value)}
    </p>
  );
};

export default ProductPrice;
