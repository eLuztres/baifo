#!/usr/bin/env node
// Remakes every category picture in 3:4 (Instagram's post shape), from the picture it has now, so the series keeps its look.
// A picture in public/ (the shop's own, e.g. /brand/categories/casa.jpg) is overwritten in place, so it ships with the
// next deploy and git keeps the old one; an uploaded one is uploaded anew and its old address printed.
//   node scripts/category-pictures.mjs            dry run: shows which pictures would be remade
//   node scripts/category-pictures.mjs --apply
import nextEnv from '@next/env';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { editImage } from '../lib/studio/openai.mjs';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

const shouldApply = process.argv.includes('--apply');
// The same size as the admin's category covers (lib/actions/studio.actions.ts PORTRAIT).
const PORTRAIT = { size: '1152x1536', output_format: 'jpeg' };
const SHOP_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';

const REFRAME_PROMPT =
  'Recreate this photograph as an upright 3:4 portrait: the very same scene, objects, colours, light, colour grading ' +
  'and photographic style. Keep everything that is in it and where it is; where the new frame needs more room, ' +
  'continue the scene naturally. No people, no hands, no text, no logos, no watermark.';

const absolute = (url) => (url.startsWith('http') ? url : new URL(url, SHOP_URL).toString());
// The file behind a picture of the shop's own, or null for an uploaded one.
const publicFile = (url) => {
  if (url.startsWith('http')) return null;
  const file = path.join(process.cwd(), 'public', url);
  return existsSync(file) ? file : null;
};

const prisma = new PrismaClient();
try {
  const categories = await prisma.category.findMany({ where: { image: { not: null } }, orderBy: { sortOrder: 'asc' } });
  const { UTApi, UTFile } = await import('uploadthing/server');
  const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });

  for (const category of categories) {
    if (!shouldApply) {
      console.log(`${category.slug}: ${category.image}`);
      continue;
    }
    const file = publicFile(category.image);
    const response = file ? null : await fetch(absolute(category.image));
    if (response && !response.ok) {
      console.log(`? ${category.slug}: picture not loaded (${response.status}), skipped`);
      continue;
    }
    const original = file ? new Uint8Array(readFileSync(file)) : new Uint8Array(await response.arrayBuffer());
    const picture = await editImage(REFRAME_PROMPT, [original], PORTRAIT);
    if (file) {
      writeFileSync(file, picture);
      console.log(`${category.slug}: ${category.image} remade`);
      continue;
    }
    const [upload] = await utapi.uploadFiles([new UTFile([picture], `category-${category.slug}-${Date.now()}.jpg`)]);
    if (!upload.data) {
      console.log(`? ${category.slug}: upload failed, skipped`, upload.error);
      continue;
    }
    await prisma.category.update({ where: { id: category.id }, data: { image: upload.data.ufsUrl } });
    console.log(`${category.slug}: ${category.image} → ${upload.data.ufsUrl}`);
  }

  if (!shouldApply && categories.length > 0) console.log('\nDry run. Run with --apply to remake them.');
} finally {
  await prisma.$disconnect();
}
