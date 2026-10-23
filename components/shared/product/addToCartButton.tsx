'use client';

import { Button } from '@/components/ui/button';
import { Loader, Plus } from 'lucide-react';
import { Product } from '@/types';
import { useCartActions } from '@/hooks/useCartActions';
import { useI18n } from '@/components/i18n-provider';

interface AddToCartButtonProps {
    product: Pick<Product, 'id' | 'stock'>;
    className?: string;
}

const AddToCartButton = ({ product, className }: AddToCartButtonProps) => {
    const { isPending, addToCart } = useCartActions();
    const { t } = useI18n();

    if (product.stock < 1) {
        return (
            <Button variant='secondary' className={className} disabled>
                {t('SOLD_OUT')}
            </Button>
        );
    }

    return (
        <Button
            variant='outline'
            className={className}
            type='button'
            disabled={isPending}
            onClick={() => addToCart(product.id)}
        >
            {isPending ? (
                <Loader className='w-4 h-4 animate-spin' />
            ) : (
                <Plus className='w-4 h-4' />
            )}{' '}
            {t('ADD_TO_CART')}
        </Button>
    );
};

export default AddToCartButton;
