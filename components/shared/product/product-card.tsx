'use client';

import Link from 'next/link';
import ProductPrice from './product-price';
import { Product } from '@/types';
import ProductMedia from "@/components/ProductMedia";
import AddToCartButton from './addToCartButton';
import BuyNowButton from "@/components/shared/product/buyNowButton";
import { useI18n } from "@/components/i18n-provider";

const ProductCard = ({ product }: { product: Product }) => {
    const { t } = useI18n();
    const inStock = product.stock > 0;

    return (
        <article className='group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10'>
            <Link
                href={`/product/${product.slug}`}
                className='relative block aspect-square overflow-hidden bg-muted'
            >
                <ProductMedia
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    className='transition-transform duration-500 ease-out group-hover:scale-105'
                />
                {!inStock && (
                    <span className='absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur'>
                        {t('SOLD_OUT')}
                    </span>
                )}
            </Link>

            <div className='flex flex-1 flex-col gap-4 p-5'>
                <div className='space-y-1'>
                    <p className='text-xs uppercase tracking-[0.2em] text-muted-foreground'>
                        {product.category}
                    </p>
                    <Link href={`/product/${product.slug}`}>
                        <h3 className='text-xl leading-snug transition group-hover:text-accent'>
                            {product.name}
                        </h3>
                    </Link>
                </div>

                <ProductPrice value={Number(product.price)} className='mt-auto' />

                {inStock && (
                    <div className='grid grid-cols-2 gap-2'>
                        <AddToCartButton product={product} className='rounded-full' />
                        <BuyNowButton product={product} className='rounded-full' />
                    </div>
                )}
            </div>
        </article>
    );
};

export default ProductCard;
