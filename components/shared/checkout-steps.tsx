'use client';

import { Fragment } from 'react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';
import type { TranslationKey } from '@/lib/i18n-core';

const STEPS: TranslationKey[] = [
  'CHECKOUT_STEP_SIGN_IN',
  'CHECKOUT_STEP_SHIPPING',
  'CHECKOUT_STEP_PAYMENT',
  'CHECKOUT_STEP_PLACE_ORDER',
];

interface CheckoutStepsProps {
  /** Index into the steps: 0 sign in, 1 shipping, 2 payment, 3 place order. */
  current?: number;
}

const CheckoutSteps = ({ current = 0 }: CheckoutStepsProps) => {
  const { t } = useI18n();

  return (
    <div className='flex-between flex-col md:flex-row space-x-2 space-y-2 mb-10'>
      {STEPS.map((step, index) => (
        <Fragment key={step}>
          <div
            className={cn(
              'p-2 w-56 rounded-full text-center text-sm',
              index === current && 'bg-secondary'
            )}
          >
            {t(step)}
          </div>
          {index < STEPS.length - 1 && (
            <hr className='w-16 border-t border-border mx-2' />
          )}
        </Fragment>
      ))}
    </div>
  );
};

export default CheckoutSteps;
