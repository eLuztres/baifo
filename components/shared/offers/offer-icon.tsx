import { Gift, GraduationCap, Megaphone, Rocket, Sparkles, Tag, type LucideIcon } from 'lucide-react';
import type { OfferIcon as OfferIconName } from '@/lib/constants';

export const OFFER_ICON_COMPONENTS: Record<OfferIconName, LucideIcon> = { GraduationCap, Rocket, Tag, Gift, Sparkles, Megaphone };

interface OfferIconProps {
  icon: OfferIconName;
  className?: string;
}

const OfferIcon = ({ icon, className }: OfferIconProps) => {
  const Icon = OFFER_ICON_COMPONENTS[icon];
  return <Icon className={className} aria-hidden='true' />;
};

export default OfferIcon;
