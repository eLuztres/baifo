import type { ComponentProps } from 'react';
import { faInstagram } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { cn } from '@/lib/utils';

type InstagramIconProps = Omit<ComponentProps<typeof FontAwesomeIcon>, 'icon'>;

export default function InstagramIcon({
  className,
  ...props
}: InstagramIconProps) {
  return (
    <FontAwesomeIcon
      icon={faInstagram}
      className={cn('h-5 w-5', className)}
      {...props}
    />
  );
}
