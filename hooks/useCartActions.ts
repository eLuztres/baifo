import { useState } from 'react';
import { addItemToCart, removeItemFromCart } from '@/lib/actions/cart.actions';
import { CartItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/components/i18n-provider';

export const useCartActions = () => {
    const [isPending, setIsPending] = useState(false);
    const { toast } = useToast();
    const { t } = useI18n();

    // Server messages are English; show the common ones in the visitor's language.
    const errorText = (message: string) =>
        message === 'Not enough stock' ? t('TOAST_NO_STOCK') : message;

    const handleAddToCart = async (item: CartItem) => {
        setIsPending(true);
        const res = await addItemToCart(item);
        setIsPending(false);

        if (!res.success) {
            toast({
                variant: 'destructive',
                description: errorText(res.message),
            });
            return;
        }

        toast({
            description: t('TOAST_ADDED', { name: item.name }),
        });
    };



    const handleRemoveFromCart = async (item: CartItem) => {
        setIsPending(true);
        const res = await removeItemFromCart(item.productId);
        setIsPending(false);

        if (!res.success) {
            toast({
                variant: 'destructive',
                description: errorText(res.message),
            });
            return;
        }

        toast({
            description: t('TOAST_REMOVED', { name: item.name }),
        });
    };

    return {
        isPending,
        handleAddToCart,
        handleRemoveFromCart,
    };
};
