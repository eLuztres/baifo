import CartTable from './cart-table';
import { getMyCart } from '@/lib/actions/cart.actions';
import { getT } from '@/lib/i18n-server';

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t('CART_TITLE') };
}

const CartPage = async () => {
  const cart = await getMyCart();

  return (
    <>
      <CartTable cart={cart} />
    </>
  );
};

export default CartPage;
