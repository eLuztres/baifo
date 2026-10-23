import { redirect } from 'next/navigation';
import { SECTION_IDS, sectionHref } from '@/components/shared/home/one-page';

// Contact is a part of the one-page home now; old links and bookmarks land there.
export default function ContactPage() {
  redirect(sectionHref(SECTION_IDS.contact));
}
