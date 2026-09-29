import { Button, Heading, Section, Text } from '@react-email/components';
import EmailLayout from '../components/email-layout';
import { EMAIL_COLORS } from '@/lib/brand';

export type NotificationEmailProps = {
  /** Shown in the inbox list next to the subject. Defaults to the heading. */
  preview?: string;
  heading: string;
  /** Recipient's name for the greeting; omitted when empty. */
  name?: string | null;
  /** One string per paragraph. */
  paragraphs: string[];
  /** Optional call-to-action button. */
  action?: { label: string; url: string };
  lang?: string;
};

/**
 * General-purpose email: heading, greeting, paragraphs and an optional button.
 * Use it for anything that doesn't need its own design (shipping updates,
 * account notices, replies to commissions, …).
 */
export default function NotificationEmail({
  preview,
  heading,
  name,
  paragraphs,
  action,
  lang,
}: NotificationEmailProps) {
  return (
    <EmailLayout preview={preview ?? heading} lang={lang}>
      <Heading as='h1' className='m-0 mb-6 text-2xl font-semibold text-[#0b0a0f]'>
        {heading}
      </Heading>
      {name && <Text className='m-0 mb-4'>Hi {name},</Text>}
      {paragraphs.map((p, i) => (
        <Text key={i} className='m-0 mb-4'>
          {p}
        </Text>
      ))}
      {action && (
        <Section className='mt-6'>
          <Button
            href={action.url}
            className='rounded-full px-6 py-3 text-sm font-semibold'
            style={{ backgroundColor: EMAIL_COLORS.primary, color: EMAIL_COLORS.primaryForeground }}
          >
            {action.label}
          </Button>
        </Section>
      )}
    </EmailLayout>
  );
}

NotificationEmail.PreviewProps = {
  heading: 'Your order is on its way',
  name: 'Ana',
  paragraphs: [
    'Good news: your order has been packed and handed to the courier.',
    'It usually arrives within 3–5 working days. We will let you know if anything changes.',
  ],
  action: { label: 'View your order', url: 'https://example.com/user/orders' },
} satisfies NotificationEmailProps;
