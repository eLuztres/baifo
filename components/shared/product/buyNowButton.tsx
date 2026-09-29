'use client';

import {Button} from '@/components/ui/button';
import {Loader,ShoppingBasket} from 'lucide-react';
import {Product} from '@/types';
import {useCartActions} from '@/hooks/useCartActions';
import {useRouter} from "next/navigation";
import clsx from "clsx";
import {useI18n} from "@/components/i18n-provider";

const BuyNowButton =  ({ product, className }: { product: Product; className?: string }) => {
    const {isPending, handleAddToCart} = useCartActions();
    const router = useRouter();
    const {t} = useI18n();

    // Decompose product into CartItem format
    const cartItem = {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        qty: 1,
        image: product.images[0],
    };

    const handleOnBuyNow = async ()=>{
        await handleAddToCart(cartItem)
        router.push('/shipping-address')
    }
    const defaultClass = '';

    return (
        <>
            {product.stock > 0 ? (
                    <Button
                        className={clsx(defaultClass, className)}
                        type='button' onClick={handleOnBuyNow}>
                        {isPending ? (
                            <Loader className='w-4 h-4 animate-spin'/>
                        ) : (
                            <ShoppingBasket className='w-4 h-4'/>
                        )}{' '}
                        {t('BUY_NOW')}
                    </Button>
                )
                :
                (
                    <Button variant='secondary' className={clsx(defaultClass, className)} disabled>
                        {t('SOLD_OUT')}
                    </Button>
                )}
        </>
    );
};

export default BuyNowButton;

