'use client';

import { type ReactNode, useState } from 'react';
import type { CorralHost } from './corral-hosts';
import CorralHostsDialog from './corral-hosts-dialog';

interface CorralHostsButtonProps {
  hosts: CorralHost[];
  text: string;
  className?: string;
  children: ReactNode;
}

/** A button that opens the corral hosts instead of one shop number. */
export default function CorralHostsButton({ hosts, text, className, children }: CorralHostsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type='button' className={className} onClick={() => setIsOpen(true)}>
        {children}
      </button>
      <CorralHostsDialog hosts={hosts} text={text} isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
