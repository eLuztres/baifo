#!/usr/bin/env node
// Suggests shop colors from an image: node scripts/brand-colors.mjs <image> [light|dark]
// Prints the dominant swatches and ready-to-use BRAND_COLOR_* values as JSON.
import { paletteFromImage, paletteFromPrimary } from './lib/colors.mjs';

const [file, themeArg] = process.argv.slice(2);
if (!file) {
  console.error('Usage: node scripts/brand-colors.mjs <image> [light|dark]');
  process.exit(1);
}

const found = await paletteFromImage(file);
const theme = themeArg ?? found.theme;
console.log(
  JSON.stringify(
    {
      suggestedTheme: found.theme,
      primary: found.primary,
      swatches: found.swatches,
      colors: paletteFromPrimary(found.primary, theme, theme === 'dark' ? undefined : '#FFFFFF'),
    },
    null,
    2
  )
);
