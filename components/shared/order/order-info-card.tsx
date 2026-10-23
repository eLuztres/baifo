import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface OrderInfoCardProps {
  title: string;
  children: ReactNode;
}

/** A titled card for the checkout and order pages (address, payment, items). */
export default function OrderInfoCard({ title, children }: OrderInfoCardProps) {
  return (
    <Card>
      <CardContent className='p-4 gap-4'>
        <h2 className='text-xl pb-4'>{title}</h2>
        {children}
      </CardContent>
    </Card>
  );
}
