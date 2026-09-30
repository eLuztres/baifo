import type { Cart, CartItem, Product } from '@/types';
import { formatCurrency } from '@/lib/utils';

// formatCurrency uses a non-breaking space that Testing Library's text matching collapses
export const displayPrice = (value: number | string) => formatCurrency(value).replace(/\s/g, ' ');

export const PRODUCT: Product = {
  id: 'prod-1',
  name: 'Volcanic Lamp',
  slug: 'volcanic-lamp',
  category: 'Lamps',
  brand: 'Eluztres',
  description: 'Resin and volcanic stone',
  stock: 3,
  images: ['/images/lamp-1.jpg', '/images/lamp-2.jpg'],
  imageIndex: 1,
  isFeatured: false,
  banner: null,
  price: '120.50',
  rating: '4.5',
  numReviews: 2,
  createdAt: new Date('2025-01-01'),
};

export const CART_ITEM: CartItem = {
  productId: PRODUCT.id,
  name: PRODUCT.name,
  slug: PRODUCT.slug,
  price: PRODUCT.price,
  qty: 2,
  image: PRODUCT.images[0],
};

export const CART: Cart = {
  items: [CART_ITEM],
  itemsPrice: '241.00',
  shippingPrice: '0.00',
  taxPrice: '36.15',
  totalPrice: '277.15',
  sessionCartId: 'session-1',
  userId: null,
};
