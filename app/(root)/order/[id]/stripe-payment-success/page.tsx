import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Stripe from 'stripe';
import { Button } from '@/components/ui/button';
import { getOrderById } from '@/lib/actions/order.actions';
import { getT } from '@/lib/i18n-server';

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t('ORDER_THANKS') };
}

interface StripePaymentSuccessPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment_intent?: string | string[] }>;
}

async function findPaymentIntent(paymentIntentId: string) {
  // Created per request: at module level it breaks the build of shops without Stripe.
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    console.error(`[stripe] Payment intent ${paymentIntentId} not found`, error);
    return null;
  }
}

const SuccessPage = async ({ params, searchParams }: StripePaymentSuccessPageProps) => {
  const [{ id }, { payment_intent: paymentIntentId }] = await Promise.all([params, searchParams]);
  if (typeof paymentIntentId !== 'string' || !paymentIntentId) notFound();

  // getOrderById returns null for anyone but the buyer or an admin.
  const [order, paymentIntent, { t }] = await Promise.all([
    getOrderById(id),
    findPaymentIntent(paymentIntentId),
    getT(),
  ]);
  if (!order || paymentIntent?.metadata.orderId !== order.id) notFound();

  if (paymentIntent.status !== 'succeeded') redirect(`/order/${order.id}`);

  return (
    <div className='max-w-4xl w-full mx-auto space-y-8'>
      <div className='flex flex-col gap-6 items-center'>
        <h1 className='h1-bold'>{t('ORDER_THANKS')}</h1>
        <div>{t('ORDER_THANKS_TEXT')}</div>
        <Button asChild>
          <Link href={`/order/${order.id}`}>{t('ORDER_VIEW')}</Link>
        </Button>
      </div>
    </div>
  );
};

export default SuccessPage;
