import { cn, formatCurrency } from '@/lib/utils';

const ProductPrice = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => {
  return (
    <p className={cn('text-2xl font-semibold tabular-nums', className)}>
      {formatCurrency(value)}
    </p>
  );
};

export default ProductPrice;
