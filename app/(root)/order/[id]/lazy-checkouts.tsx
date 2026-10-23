'use client';

import dynamic from 'next/dynamic';

export function PaymentSkeleton() {
  return <div className='h-12 w-full animate-pulse rounded-md bg-muted' />;
}

// Each payment SDK is downloaded only on unpaid orders that use it, never on the others.
export const PayPalCheckout = dynamic(() => import('./paypal-checkout'), {
  ssr: false,
  loading: PaymentSkeleton,
});

export const StripeCheckout = dynamic(() => import('./stripe-payment'), {
  ssr: false,
  loading: PaymentSkeleton,
});
