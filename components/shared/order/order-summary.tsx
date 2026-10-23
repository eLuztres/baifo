import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { getT } from '@/lib/i18n-server';
import type { TranslationKey } from '@/lib/i18n';
import { formatCurrency } from '@/lib/utils';

interface OrderPrices {
  itemsPrice: string;
  taxPrice: string;
  shippingPrice: string;
  totalPrice: string;
}

interface OrderSummaryProps {
  prices: OrderPrices;
  /** Shown under the totals, e.g. the place-order button or the payment form. */
  children?: ReactNode;
}

export default async function OrderSummary({ prices, children }: OrderSummaryProps) {
  const { t } = await getT();
  const rows: [TranslationKey, string][] = [
    ['ORDER_ITEMS_PRICE', prices.itemsPrice],
    ['ORDER_TAX', prices.taxPrice],
    ['ORDER_SHIPPING', prices.shippingPrice],
    ['ORDER_TOTAL', prices.totalPrice],
  ];

  return (
    <Card className='h-fit'>
      <CardContent className='p-4 gap-4 space-y-4'>
        {rows.map(([label, amount]) => (
          <div key={label} className='flex justify-between'>
            <div>{t(label)}</div>
            <div>{formatCurrency(amount)}</div>
          </div>
        ))}
        {children}
      </CardContent>
    </Card>
  );
}
