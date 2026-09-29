'use client';

import { Button } from '@/components/ui/button';
import { Loader, Plus } from 'lucide-react';
import { Product } from '@/types';
import { useCartActions } from '@/hooks/useCartActions';
import clsx from 'clsx';  // Optional, for conditional classnames
import { useI18n } from '@/components/i18n-provider';

const AddToCartButton = ({ product, className }: { product: Product; className?: string }) => {
    const { isPending, handleAddToCart } = useCartActions();
    const { t } = useI18n();

    // Decompose product into CartItem format
    const cartItem = {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        qty: 1,
        image: product.images[product.imageIndex],

    };

    // Default classes
    const defaultClass = '';

    return (
        <>
            {product.stock > 0 ? (
                <Button
                    variant="outline"
                    className={clsx(defaultClass, className)} // Merge default classes with passed className
                    type='button'
                    onClick={() => handleAddToCart(cartItem)}
                >
                    {isPending ? (
                        <Loader className='w-4 h-4 animate-spin' />
                    ) : (
                        <Plus className='w-4 h-4' />
                    )}{' '}
                    {t('ADD_TO_CART')}
                </Button>
            ) : (
                <Button variant='secondary' className={clsx(defaultClass, className)} disabled>
                    {t('SOLD_OUT')}
                </Button>
            )}
        </>
    );
};

export default AddToCartButton;
