import { redirect } from 'next/navigation';

// The listings live on "Anuncios"; older links to the product catalog land there.
export default function AdminProductsPage() {
  redirect('/admin/listings');
}
