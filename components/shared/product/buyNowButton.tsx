'use client';

import {Button} from '@/components/ui/button';
import {Loader,ShoppingBasket} from 'lucide-react';
import {Product} from '@/types';
import {useCartActions} from '@/hooks/useCartActions';
import {useRouter} from "next/navigation";
import {useI18n} from "@/components/i18n-provider";

interface BuyNowButtonProps {
    product: Pick<Product, 'id' | 'stock'>;
    className?: string;
}

const BuyNowButton =  ({ product, className }: BuyNowButtonProps) => {
    const {isPending, addToCart} = useCartActions();
    const router = useRouter();
    const {t} = useI18n();

    // Checkout opens only once the product is really in the cart.
    const handleOnBuyNow = () =>
        addToCart(product.id, { onInCart: () => router.push('/shipping-address') });

    if (product.stock < 1) {
        return (
            <Button variant='secondary' className={className} disabled>
                {t('SOLD_OUT')}
            </Button>
        );
    }

    return (
        <Button
            className={className}
            type='button'
            disabled={isPending}
            onClick={handleOnBuyNow}>
            {isPending ? (
                <Loader className='w-4 h-4 animate-spin'/>
            ) : (
                <ShoppingBasket className='w-4 h-4'/>
            )}{' '}
            {t('BUY_NOW')}
        </Button>
    );
};

export default BuyNowButton;
