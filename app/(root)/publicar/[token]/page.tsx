import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/db/prisma';
import ProductImages from '@/components/shared/product/product-images';
import ProductPrice from '@/components/shared/product/product-price';
import { Button } from '@/components/ui/button';
import { LISTING_DAYS, LISTING_PRICES } from '@/lib/marketplace/config';
import { publishPageTexts } from '@/lib/marketplace/page-texts';
import { getLocale } from '@/lib/i18n-server';
import PublishForm from './publish-form';

// A private link: no search engine should list it.
export const metadata: Metadata = { title: 'Baifo', robots: { index: false, follow: false } };

interface PublishPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ pagado?: string }>;
}

const UUID = /^[0-9a-f-]{36}$/i;

/** The seller's page after the review: the listing as it will look, the plan, and the payment. */
export default async function PublishPage({ params, searchParams }: PublishPageProps) {
  const [{ token }, { pagado }, locale] = await Promise.all([params, searchParams, getLocale()]);
  const texts = publishPageTexts(locale);
  const submission = UUID.test(token)
    ? await prisma.submission.findUnique({ where: { payToken: token }, include: { product: { select: { slug: true } } } })
    : null;

  if (!submission || !['AWAITING_PAYMENT', 'LIVE'].includes(submission.status)) {
    return <p className='mx-auto max-w-xl py-16 text-center text-muted-foreground'>{texts.unavailable}</p>;
  }

  const isLive = submission.status === 'LIVE';
  const description = locale === 'es' ? submission.description : (submission.descriptionEn ?? submission.description);

  return (
    <section className='mx-auto grid max-w-5xl gap-8 py-6 lg:grid-cols-2 lg:gap-12'>
      <div className='aspect-square'>
        <ProductImages images={submission.images.length > 0 ? submission.images : submission.rawImages} alt={submission.title ?? ''} />
      </div>

      <div className='space-y-6'>
        <div className='space-y-3'>
          <p className='eyebrow'>{texts.title}</p>
          <h1 className='text-3xl leading-tight'>{submission.title}</h1>
          {submission.price && <ProductPrice value={Number(submission.price)} />}
          {description && <p className='whitespace-pre-line text-foreground/85'>{description}</p>}
        </div>

        {isLive || pagado ? (
          <div className='space-y-4 rounded-3xl border border-primary/30 bg-primary/10 p-6'>
            <p>{isLive ? texts.live : texts.paid}</p>
            {submission.product && (
              <Button asChild className='rounded-full'>
                <Link href={`/product/${submission.product.slug}`}>{texts.viewListing}</Link>
              </Button>
            )}
          </div>
        ) : (
          <PublishForm
            token={token}
            texts={texts}
            prices={LISTING_PRICES}
            days={LISTING_DAYS}
            paypalClientId={process.env.PAYPAL_CLIENT_ID || 'sb'}
          />
        )}
      </div>
    </section>
  );
}
