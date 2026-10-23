import { useTransition } from 'react';
import {
    addItemToCart,
    removeItemFromCart,
    type CartActionResult,
} from '@/lib/actions/cart.actions';
import { useToast } from '@/hooks/use-toast';

// A request that never reaches the server (offline) rejects; without this the
// transition would throw into the error page.
const REQUEST_FAILED: CartActionResult = { success: false, message: 'ERROR_GENERIC' };

interface CartActionsOptions {
    /** The cart page shows the new quantity itself, so it only toasts errors. */
    shouldToastSuccess?: boolean;
}

interface AddToCartOptions {
    /** Runs once the product is in the cart, also when it already was at full stock (Buy now). */
    onInCart?: () => void;
}

/** Cart buttons: one pending state per hook, server messages (already translated) as toasts. */
export const useCartActions = ({ shouldToastSuccess = true }: CartActionsOptions = {}) => {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const showResult = (result: CartActionResult) => {
        if (!result.success) {
            toast({ variant: 'destructive', description: result.message });
        } else if (shouldToastSuccess) {
            toast({ description: result.message });
        }
    };

    const addToCart = (productId: string, { onInCart }: AddToCartOptions = {}) =>
        startTransition(async () => {
            const result = await addItemToCart({ productId }).catch(() => REQUEST_FAILED);
            const isInCart = result.success || Boolean(result.isInCart);
            // Buy now only needs the product in the cart, so "no more stock" is no error there.
            if (!(onInCart && result.isInCart)) showResult(result);
            // After an await, React needs a new startTransition to stay pending while navigating.
            if (onInCart && isInCart) startTransition(onInCart);
        });

    const removeFromCart = (productId: string) =>
        startTransition(async () => {
            showResult(await removeItemFromCart(productId).catch(() => REQUEST_FAILED));
        });

    return {
        isPending,
        addToCart,
        removeFromCart,
    };
};
