import ProductCard from './product-card';
import { Product } from '@/types';

const ProductList = ({
  data,
  title,
  limit,
  emptyMessage = 'No products found',
}: {
  data: Product[];
  title?: string;
  limit?: number;
  emptyMessage?: string;
}) => {
  const limitedData = limit ? data.slice(0, limit) : data;

  return (
    <div>
      {title && <h2 className='section-title mb-6'>{title}</h2>}
      {data.length > 0 ? (
        <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {limitedData.map((product: Product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      ) : (
        <div className='rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground'>
          {emptyMessage}
        </div>
      )}
    </div>
  );
};

export default ProductList;
