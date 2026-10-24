'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { ImagePlus, Loader2, RotateCcw, SendHorizontal } from 'lucide-react';
import ProductMedia from '@/components/ProductMedia';
import { Button } from '@/components/ui/button';
import { UploadButton } from '@/lib/uploadthing';
import { preparePhotos } from '@/lib/prepare-photos';
import {
  getSimulatorState,
  resetSimulatorAction,
  sendSimulated,
  type SimulatedMessageView,
  type SimulatorState,
} from '@/lib/marketplace/simulator.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import { cn } from '@/lib/utils';

type Side = 'seller' | 'admin';

interface WhatsappSimulatorProps {
  initial: SimulatorState;
  texts: AdminTexts;
}

const POLL_MS = 2000;
const LINK = /(https?:\/\/[^\s]+)/;
const isLink = (part: string) => /^https?:\/\//.test(part);

/** Bot texts with their links clickable (the payment link opens the real /publicar page). */
function MessageText({ text }: { text: string }) {
  return (
    <p className='whitespace-pre-line break-words text-sm leading-5'>
      {text.split(LINK).map((part, index) =>
        isLink(part) ? (
          <a key={index} href={part} target='_blank' rel='noopener noreferrer' className='font-medium text-primary underline underline-offset-2'>
            {part}
          </a>
        ) : (
          part
        )
      )}
    </p>
  );
}

interface BubbleProps {
  message: SimulatedMessageView;
  onButton: (button: { id: string; title: string }) => void;
  disabled: boolean;
}

function Bubble({ message, onButton, disabled }: BubbleProps) {
  const isMine = message.direction === 'in';
  return (
    <li className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] overflow-hidden rounded-2xl shadow-sm',
          isMine ? 'rounded-br-md bg-primary/15' : 'rounded-bl-md bg-card'
        )}
      >
        {message.image && (
          <div className='relative aspect-square w-56 bg-muted'>
            <ProductMedia src={message.image} alt='' fill />
          </div>
        )}
        {message.text && (
          <div className='px-3 py-2'>
            <MessageText text={message.text} />
          </div>
        )}
        <p className='px-3 pb-1.5 text-right text-[10px] text-muted-foreground'>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        {message.buttons.length > 0 && (
          <div className='grid border-t border-border'>
            {message.buttons.map((button) => (
              <button
                key={button.id}
                type='button'
                disabled={disabled}
                onClick={() => onButton(button)}
                className='border-b border-border px-3 py-2 text-sm font-medium text-primary transition last:border-b-0 hover:bg-primary/5 disabled:opacity-50'
              >
                {button.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

interface PhoneProps {
  side: Side;
  title: string;
  emptyText: string;
  messages: SimulatedMessageView[];
  isWorking: boolean;
  texts: AdminTexts;
  onSend: (side: Side, input: { text?: string; photos?: string[]; button?: { id: string; title: string } }) => void;
  isSending: boolean;
}

function Phone({ side, title, emptyText, messages, isWorking, texts, onSend, isSending }: PhoneProps) {
  const [draft, setDraft] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, isWorking]);

  const sendText = () => {
    if (!draft.trim()) return;
    onSend(side, { text: draft.trim() });
    setDraft('');
  };

  return (
    <section className='flex h-[min(78vh,720px)] flex-col overflow-hidden rounded-[2rem] border-8 border-foreground/90 bg-muted shadow-2xl'>
      <header className='flex items-center gap-3 bg-primary px-4 py-3 text-primary-foreground'>
        <span className='flex size-9 items-center justify-center rounded-full bg-primary-foreground/20 text-sm font-semibold'>
          {side === 'seller' ? 'V' : 'A'}
        </span>
        <div className='leading-tight'>
          <p className='font-semibold'>{title}</p>
          <p className='text-xs opacity-80'>{side === 'seller' ? 'Baifo' : 'Baifo · admin'}</p>
        </div>
      </header>

      <ol ref={listRef} className='flex-1 space-y-2 overflow-y-auto p-3'>
        {messages.length === 0 && <li className='mx-auto max-w-[80%] rounded-xl bg-card/80 p-3 text-center text-xs text-muted-foreground'>{emptyText}</li>}
        {messages.map((message) => (
          <Bubble key={message.id} message={message} disabled={isSending} onButton={(button) => onSend(side, { button })} />
        ))}
        {isWorking && side === 'seller' && (
          <li className='flex items-center gap-2 text-xs text-muted-foreground'>
            <Loader2 className='size-3.5 animate-spin' /> {texts.simWorking}
          </li>
        )}
      </ol>

      <footer className='flex items-center gap-2 border-t border-border bg-card p-2'>
        {side === 'seller' && (
          <UploadButton
            endpoint='photosUploader'
            onBeforeUploadBegin={(files) => {
              setIsUploading(true);
              return preparePhotos(files);
            }}
            onClientUploadComplete={(files) => {
              setIsUploading(false);
              // The draft goes along as the caption, like WhatsApp does.
              onSend(side, { photos: files.map((file) => file.ufsUrl), text: draft.trim() || undefined });
              setDraft('');
            }}
            onUploadError={() => setIsUploading(false)}
            appearance={{
              button: 'size-10 rounded-full bg-muted text-foreground ut-uploading:cursor-wait after:bg-primary/30',
              allowedContent: 'hidden',
              container: 'w-auto',
            }}
            content={{ button: isUploading ? <Loader2 className='size-4 animate-spin' /> : <ImagePlus className='size-4' aria-label={texts.simAddPhotos} /> }}
          />
        )}
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && sendText()}
          placeholder={texts.simPlaceholder}
          className='h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus-visible:border-primary'
        />
        <Button type='button' size='icon' className='size-10 rounded-full' disabled={!draft.trim() || isSending} onClick={sendText} aria-label={texts.simSend}>
          <SendHorizontal className='size-4' />
        </Button>
      </footer>
    </section>
  );
}

/** Two phones side by side: the seller writes to Baifo, the admin reviews. Both run Baifo's real message code. */
export default function WhatsappSimulator({ initial, texts }: WhatsappSimulatorProps) {
  const [state, setState] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    const next = await getSimulatorState();
    if (next) setState(next);
  }, []);

  useEffect(() => {
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const send: PhoneProps['onSend'] = (side, input) =>
    startTransition(async () => {
      await sendSimulated({ as: side, ...input });
      await refresh();
    });

  const reset = () =>
    startTransition(async () => {
      await resetSimulatorAction();
      await refresh();
    });

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <p className='max-w-2xl text-muted-foreground'>{texts.simIntro}</p>
        <Button variant='outline' className='shrink-0 rounded-full' disabled={isPending} onClick={reset}>
          <RotateCcw /> {texts.simReset}
        </Button>
      </div>
      <div className='grid gap-6 lg:grid-cols-2'>
        <Phone side='seller' title={texts.simSeller} emptyText={texts.simEmptySeller} messages={state.seller} isWorking={state.isWorking} texts={texts} onSend={send} isSending={isPending} />
        <Phone side='admin' title={texts.simAdmin} emptyText={texts.simEmptyAdmin} messages={state.admin} isWorking={false} texts={texts} onSend={send} isSending={isPending} />
      </div>
    </div>
  );
}
