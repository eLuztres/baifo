import { useState } from 'react';
import { Meta, StoryObj } from '@storybook/nextjs-vite';
import '@/assets/styles/globals.css';
import TextModeSwitch from '@/components/marketplace/text-mode-switch';
import { adminTexts } from '@/lib/marketplace/admin-texts';
import type { TextMode } from '@/lib/marketplace/text-versions';

const texts = adminTexts('es');

// Keeps the choice, so a click shows the next option checked.
const WithChoice = ({ isCompact, hasCorrected = true }: { isCompact?: boolean; hasCorrected?: boolean }) => {
  const [value, setValue] = useState<TextMode>('ai');
  const shownTexts = hasCorrected ? texts : { ...texts, textModeCorrected: undefined };
  return <TextModeSwitch value={value} onChange={setValue} texts={shownTexts} isCompact={isCompact} />;
};

const meta: Meta<typeof WithChoice> = {
  title: 'Marketplace/TextModeSwitch',
  component: WithChoice,
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<typeof WithChoice>;

export const Cards: Story = {};

export const Compact: Story = { args: { isCompact: true } };

/** The category editor passes no "only fix mistakes" labels. */
export const TwoChoices: Story = { args: { hasCorrected: false } };
