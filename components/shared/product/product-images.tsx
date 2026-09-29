'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import ProductMedia from "@/components/ProductMedia";
import { useI18n } from "@/components/i18n-provider";

const ProductImages = ({ images, alt = 'Product image' }: { images: string[]; alt?: string }) => {
  const [current, setCurrent] = useState(0);
  const { t } = useI18n();

  return (
    <div className='space-y-4'>
      <div className='relative aspect-square overflow-hidden rounded-3xl border border-border bg-muted'>
        <ProductMedia
          src={images[current]}
          alt={alt}
          fill
          sizes='(min-width: 1024px) 50vw, 100vw'
        />
      </div>
      {images.length > 1 && (
        <div className='flex flex-wrap gap-3'>
          {images.map((image, index) => (
            <button
              type='button'
              key={image}
              onClick={() => setCurrent(index)}
              aria-label={t('SHOW_IMAGE', { n: index + 1 })}
              className={cn(
                'relative h-20 w-20 overflow-hidden rounded-xl border-2 border-transparent opacity-60 transition hover:opacity-100',
                current === index && 'border-accent opacity-100'
              )}
            >
              <ProductMedia src={image} alt='' fill sizes='80px' />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImages;
