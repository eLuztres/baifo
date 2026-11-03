'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';

interface LeaveGuardProps {
  /** Work the page already holds, e.g. pictures after a reload; anything typed or dropped counts by itself. */
  hasWork: boolean;
  texts: AdminTexts;
}

/** Asks before a link or the back button leaves the page; closing or reloading gets the browser's own question. */
export default function LeaveGuard({ hasWork, texts }: LeaveGuardProps) {
  const router = useRouter();
  const [hasTouched, setHasTouched] = useState(false);
  // What "Salir" does, set while the question is open.
  const [leave, setLeave] = useState<(() => void) | null>(null);
  const isLeaving = useRef(false);
  const hasBackStop = useRef(false);
  const isArmed = hasWork || hasTouched;

  useEffect(() => {
    if (isArmed) return;
    const touch = () => setHasTouched(true);
    const events = ['input', 'change', 'drop'];
    events.forEach((name) => document.addEventListener(name, touch, true));
    return () => events.forEach((name) => document.removeEventListener(name, touch, true));
  }, [isArmed]);

  useEffect(() => {
    if (!isArmed) return;
    const confirmLeaving = (go: () => void) =>
      setLeave(() => () => {
        isLeaving.current = true;
        go();
      });

    const warnOnUnload = (event: BeforeUnloadEvent) => {
      if (!isLeaving.current) event.preventDefault();
    };

    // On the document's way down: it runs before Next's Link starts the navigation.
    const askOnLink = (event: MouseEvent) => {
      if (isLeaving.current || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href);
      const isSamePage = url.origin === location.origin && url.pathname === location.pathname && url.search === location.search;
      if (isSamePage || !url.protocol.startsWith('http')) return;
      event.preventDefault();
      event.stopPropagation();
      confirmLeaving(() => (url.origin === location.origin ? router.push(url.href) : location.assign(url.href)));
    };

    // Back can't be cancelled, so an extra history entry takes it; capture and stop keep Next from navigating.
    if (!hasBackStop.current) {
      hasBackStop.current = true;
      history.pushState(history.state, '', location.href);
    }
    const askOnBack = (event: PopStateEvent) => {
      if (isLeaving.current) return;
      event.stopImmediatePropagation();
      history.pushState(history.state, '', location.href);
      confirmLeaving(() => history.go(-2));
    };

    window.addEventListener('beforeunload', warnOnUnload);
    document.addEventListener('click', askOnLink, true);
    window.addEventListener('popstate', askOnBack, true);
    return () => {
      window.removeEventListener('beforeunload', warnOnUnload);
      document.removeEventListener('click', askOnLink, true);
      window.removeEventListener('popstate', askOnBack, true);
    };
  }, [isArmed, router]);

  return (
    <AlertDialog open={leave !== null} onOpenChange={(isOpen) => !isOpen && setLeave(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{texts.leaveTitle}</AlertDialogTitle>
          <AlertDialogDescription>{texts.leaveText}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{texts.leaveStay}</AlertDialogCancel>
          <AlertDialogAction onClick={() => leave?.()}>{texts.leaveGo}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
