'use client';

import { useState, useTransition } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { saveAndSendListingsEmail, saveListingsEmailSettings } from '@/lib/marketplace/email.actions';

const TEXTS = {
  es: {
    title: 'Lista de anuncios por email',
    hint: 'Todos los anuncios online con foto, precio y contacto, lista para imprimir.',
    email: 'Enviar a',
    auto: 'Enviarla también después de cada anuncio nuevo',
    send: 'Enviar lista ahora',
    sent: 'Lista enviada',
    saved: 'Guardado',
    notSent: 'No se pudo enviar. ¿Está configurado Resend?',
    invalidEmail: 'Escribe un email válido',
  },
  en: {
    title: 'Listings by email',
    hint: 'All live listings with photo, price and contact, ready to print.',
    email: 'Send to',
    auto: 'Also send it after every new listing',
    send: 'Send list now',
    sent: 'List sent',
    saved: 'Saved',
    notSent: 'Could not send. Is Resend set up?',
    invalidEmail: 'Enter a valid email',
  },
};

interface ListingsEmailCardProps {
  locale: string;
  initialEmail: string;
  initialSendOnPublish: boolean;
}

/** Where the printable list goes, whether it goes by itself, and a button to send it now. */
export default function ListingsEmailCard({ locale, initialEmail, initialSendOnPublish }: ListingsEmailCardProps) {
  const texts = locale === 'es' ? TEXTS.es : TEXTS.en;
  const { toast } = useToast();
  const [email, setEmail] = useState(initialEmail);
  const [sendOnPublish, setSendOnPublish] = useState(initialSendOnPublish);
  const [isPending, startTransition] = useTransition();

  const report = (result: { success: boolean; message: string }) => {
    toast({
      variant: result.success ? 'default' : 'destructive',
      description: texts[result.message as keyof typeof texts] ?? result.message,
    });
  };

  const send = () => startTransition(async () => report(await saveAndSendListingsEmail({ listingsEmail: email, sendOnPublish })));

  const toggleAuto = (value: boolean) => {
    setSendOnPublish(value);
    if (email.trim()) startTransition(async () => report(await saveListingsEmailSettings({ listingsEmail: email, sendOnPublish: value })));
  };

  return (
    <section className='flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 sm:flex-row sm:items-end sm:p-6'>
      <div className='flex-1 space-y-3'>
        <div className='space-y-1'>
          <h2 className='flex items-center gap-2 font-display text-xl'>
            <Mail className='size-5 text-primary' /> {texts.title}
          </h2>
          <p className='text-sm text-muted-foreground'>{texts.hint}</p>
        </div>
        <div className='space-y-2'>
          <Label htmlFor='listings-email'>{texts.email}</Label>
          <Input id='listings-email' type='email' value={email} onChange={(event) => setEmail(event.target.value)} placeholder='hola@baifo.es' className='h-11 rounded-2xl bg-background' />
        </div>
        <Label className='flex items-center gap-3 font-normal'>
          <Checkbox checked={sendOnPublish} onCheckedChange={(value) => toggleAuto(value === true)} />
          {texts.auto}
        </Label>
      </div>
      <Button className='h-11 rounded-full' disabled={isPending || !email.trim()} onClick={send}>
        {isPending ? <Loader2 className='animate-spin' /> : <Mail />} {texts.send}
      </Button>
    </section>
  );
}
