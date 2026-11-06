import { redirect } from 'next/navigation';

// Hashtags became etiquetas; old bookmarks land on their page.
export default function HashtagsPage() {
  redirect('/admin/etiquetas');
}
