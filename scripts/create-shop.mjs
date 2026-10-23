#!/usr/bin/env node
/**
 * Creates a new customer shop from this template.
 *
 *   npm run create-shop                                   # asks everything step by step
 *   npm run create-shop -- --config shop.json             # from a file (used by the Claude skill)
 *
 * It clones the template next to it, connects it as `upstream` for future updates,
 * writes .env and the brand files, commits, and optionally creates and pushes the GitHub repo.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { normalizeHex, paletteFromImage, paletteFromPrimary } from './lib/colors.mjs';

const TEMPLATE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES = ['en', 'es', 'de', 'fr', 'it'];
const THEMES = ['light', 'dark', 'system'];
const DECORATIONS = ['none', 'dunes', 'goldleaf'];

const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const step = (s) => console.log(`\n${bold('▸')} ${s}`);

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const hasCommand = (cmd) => spawnSync('sh', ['-c', `command -v ${cmd}`]).status === 0;
const slugify = (s) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--config') args.config = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') args.help = true;
  }
  return args;
}

// ── Questions ────────────────────────────────────────────────────────────

// Reads answers line by line: rl.question() drops lines that arrive early (pasted or piped answers).
function createPrompter() {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
  const lines = rl[Symbol.asyncIterator]();
  return {
    async question(text) {
      process.stdout.write(text);
      const { value, done } = await lines.next();
      if (done) throw new Error('Input ended before all questions were answered.');
      if (!process.stdin.isTTY) process.stdout.write(`${value}\n`);
      return value;
    },
    close: () => rl.close(),
  };
}

async function ask(rl, question, fallback = '') {
  const hint = fallback ? dim(` (${fallback})`) : '';
  const answer = (await rl.question(`  ${question}${hint}: `)).trim();
  return answer || fallback;
}

async function askYesNo(rl, question, fallback) {
  const answer = (await ask(rl, `${question} [${fallback ? 'Y/n' : 'y/N'}]`)).toLowerCase();
  return answer ? answer.startsWith('y') : fallback;
}

async function askChoice(rl, question, choices, fallback) {
  for (;;) {
    const answer = await ask(rl, `${question} [${choices.join('/')}]`, fallback);
    if (choices.includes(answer)) return answer;
    console.log(yellow(`  Please answer one of: ${choices.join(', ')}`));
  }
}

async function interview() {
  const rl = createPrompter();
  const config = { contact: {} };
  console.log(bold('\n🛍  New customer shop\n'));

  console.log(bold('The basics'));
  config.name = await ask(rl, 'Shop name, e.g. "Ocean Surf Co."');
  while (!config.name) config.name = await ask(rl, yellow('A name is required'));
  config.slug = await ask(rl, 'Short id for folder and repo', `shop-${slugify(config.name)}`);
  config.description = await ask(rl, 'One-sentence description', '');

  console.log(bold('\nLook'));
  config.logo = await ask(rl, 'Logo file or URL (png/svg/jpg, empty = placeholder)', '');
  config.theme = await askChoice(rl, 'Theme', THEMES, 'light');
  config.decoration = await askChoice(rl, 'Background decoration', DECORATIONS, 'none');
  config.primaryColor = await ask(rl, 'Main color as hex (empty = taken from the logo)', '');

  console.log(bold('\nContact') + dim('  (leave empty to hide)'));
  config.contact.email = await ask(rl, 'Email', '');
  config.contact.phone = await ask(rl, 'Phone, e.g. +34 600 000 000', '');
  if (config.contact.phone && (await askYesNo(rl, 'Is it also on WhatsApp?', true))) {
    config.contact.whatsapp = config.contact.phone;
  }
  config.contact.instagram = await ask(rl, 'Instagram account', '');

  console.log(bold('\nShop'));
  config.locales = (await ask(rl, `Languages (${LOCALES.join(',')})`, 'en')).split(',').map((l) => l.trim());
  config.defaultLocale = config.locales[0];
  config.currency = (await ask(rl, 'Currency', 'EUR')).toUpperCase();
  config.showcase = await askYesNo(rl, 'Showcase only (no prices or cart, visitors send "I\'m interested")?', false);

  console.log(bold('\nRepository'));
  const gh = hasCommand('gh');
  if (gh && (await askYesNo(rl, `Create a private GitHub repo "${config.slug}" with gh?`, true))) {
    config.createGithubRepo = true;
  } else {
    if (!gh) console.log(dim('  (Install the GitHub CLI "gh" to create the repo automatically.)'));
    config.githubRepo = await ask(rl, 'Existing empty repo URL to push to (empty = skip)', '');
  }
  config.install = await askYesNo(rl, 'Run npm install now?', true);

  rl.close();
  return config;
}

// ── Building the shop ────────────────────────────────────────────────────

function envQuote(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** Fill .env.example: set values replace (and uncomment) their line; unknown keys are appended. */
function renderEnv(template, values) {
  const pending = new Map(Object.entries(values).filter(([, v]) => v !== undefined && v !== ''));
  const lines = template.split('\n').map((line) => {
    const match = line.match(/^#?\s?([A-Z][A-Z0-9_]*)=/);
    if (!match || !pending.has(match[1])) return line;
    const key = match[1];
    const value = pending.get(key);
    pending.delete(key);
    return `${key}=${envQuote(value)}`;
  });
  if (pending.size > 0) {
    lines.push('', '# Added by create-shop');
    for (const [key, value] of pending) lines.push(`${key}=${envQuote(value)}`);
  }
  return lines.join('\n');
}

async function copyAsset(source, targetDir, name) {
  mkdirSync(targetDir, { recursive: true });
  if (/^https?:\/\//.test(source)) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Could not download ${source} (${response.status})`);
    const type = response.headers.get('content-type') ?? '';
    const ext = type.includes('svg') ? '.svg' : type.includes('png') ? '.png' : type.includes('webp') ? '.webp' : '.jpg';
    const target = join(targetDir, name + ext);
    writeFileSync(target, Buffer.from(await response.arrayBuffer()));
    return target;
  }
  const file = resolve(source);
  if (!existsSync(file)) throw new Error(`File not found: ${source}`);
  const target = join(targetDir, name + extname(file).toLowerCase());
  copyFileSync(file, target);
  return target;
}

function validate(config) {
  if (!config.name) throw new Error('"name" is required.');
  config.slug = slugify(config.slug || `shop-${config.name}`);
  config.theme = THEMES.includes(config.theme) ? config.theme : 'light';
  config.decoration = DECORATIONS.includes(config.decoration) ? config.decoration : 'none';
  config.locales = (config.locales ?? []).filter((l) => LOCALES.includes(l));
  if (config.locales.length === 0) config.locales = ['en'];
  if (!config.locales.includes(config.defaultLocale)) config.defaultLocale = config.locales[0];
  config.contact ??= {};
  config.dir = resolve(config.dir ?? join(dirname(TEMPLATE_DIR), config.slug));
  if (existsSync(config.dir)) throw new Error(`${config.dir} already exists. Choose another slug or "dir".`);
  if (config.primaryColor && !normalizeHex(config.primaryColor)) {
    throw new Error(`"${config.primaryColor}" is not a hex color like #14B8A6.`);
  }
  return config;
}

function templateSource() {
  if (git(TEMPLATE_DIR, 'status', '--porcelain')) {
    console.log(yellow('  ⚠ The template has uncommitted changes. Only committed code is copied to the new shop.'));
  }
  // Customer repos pull updates from the template's GitHub repo, or from this folder if it has none.
  try {
    return git(TEMPLATE_DIR, 'remote', 'get-url', 'origin');
  } catch {
    return TEMPLATE_DIR;
  }
}

async function createShop(config) {
  const { dir } = config;
  const upstream = templateSource();

  step(`Copying the template to ${bold(dir)}`);
  git(dirname(dir), 'clone', '--quiet', TEMPLATE_DIR, dir);
  git(dir, 'remote', 'remove', 'origin');
  git(dir, 'remote', 'add', 'upstream', upstream);
  console.log(`  updates come from ${dim(upstream)}`);

  step('Brand files');
  const brandDir = join(dir, 'public', 'brand');
  const env = {
    APP_NAME: config.name,
    APP_DESCRIPTION: config.description,
    BRAND_THEME: config.theme,
    BRAND_DECORATION: config.decoration === 'none' ? undefined : config.decoration,
    BRAND_SHOW_NAME: config.showName === false ? 'false' : undefined,
    BRAND_RADIUS: config.radius,
  };

  let logoFile;
  if (config.logo) {
    logoFile = await copyAsset(config.logo, brandDir, 'logo');
    env.BRAND_LOGO = `/brand/${basename(logoFile)}`;
    env.BRAND_ICON = env.BRAND_LOGO;
    console.log(`  logo → public/brand/${basename(logoFile)}`);
  }
  if (config.icon) {
    env.BRAND_ICON = `/brand/${basename(await copyAsset(config.icon, brandDir, 'icon'))}`;
  }
  if (config.heroImage) {
    env.BRAND_HERO_IMAGE = `/brand/${basename(await copyAsset(config.heroImage, brandDir, 'hero'))}`;
  }

  // Colors: explicit ones win, otherwise derived from the primary (given or taken from the logo).
  let primary = normalizeHex(config.primaryColor);
  if (!primary && logoFile && !logoFile.endsWith('.svg')) {
    primary = (await paletteFromImage(logoFile)).primary;
    console.log(`  main color from the logo: ${primary}`);
  }
  if (primary) {
    const palette = { ...paletteFromPrimary(primary, config.theme === 'dark' ? 'dark' : 'light', config.backgroundColor) };
    for (const [token, value] of Object.entries({ ...palette, ...(config.colors ?? {}) })) {
      env[`BRAND_COLOR_${token.toUpperCase().replace(/-/g, '_')}`] = normalizeHex(value) ?? value;
    }
    if (config.theme === 'system') {
      // Light colors above; derive a matching dark set so the toggle still looks branded.
      for (const [token, value] of Object.entries(paletteFromPrimary(primary, 'dark'))) {
        env[`BRAND_DARK_COLOR_${token.toUpperCase().replace(/-/g, '_')}`] = value;
      }
    }
    console.log(`  ${Object.keys(env).filter((k) => k.includes('COLOR_')).length} color tokens set`);
  }

  for (const [locale, texts] of Object.entries(config.texts ?? {})) {
    if (!LOCALES.includes(locale)) continue;
    const file = join(dir, 'brand', 'messages', `${locale}.json`);
    const current = JSON.parse(readFileSync(file, 'utf8'));
    writeFileSync(file, JSON.stringify({ ...current, ...texts }, null, 2) + '\n');
    console.log(`  texts → brand/messages/${locale}.json`);
  }

  step('Writing .env');
  Object.assign(env, {
    CONTACT_EMAIL: config.contact.email,
    CONTACT_PHONE: config.contact.phone,
    WHATSAPP_NUMBER: config.contact.whatsapp?.replace(/\D/g, ''),
    INSTAGRAM_ACCOUNT: config.contact.instagram?.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/.*$/, ''),
    LOCALES: config.locales.join(','),
    DEFAULT_LOCALE: config.defaultLocale,
    NEXT_PUBLIC_CURRENCY: config.currency,
    NEXT_PUBLIC_NUMBER_LOCALE: config.numberLocale,
    TAX_RATE: config.taxRate,
    SHIPPING_PRICE: config.shippingPrice,
    FREE_SHIPPING_THRESHOLD: config.freeShippingThreshold,
    PAYMENT_METHODS: config.paymentMethods?.join(', '),
    SHOWCASE_MODE: config.showcase ? 'true' : undefined,
    NEXT_PUBLIC_SERVER_URL: config.serverUrl,
    AUTH_SECRET: randomBytes(32).toString('base64'),
    ENCRYPTION_KEY: randomBytes(32).toString('hex'),
  });
  writeFileSync(join(dir, '.env'), renderEnv(readFileSync(join(dir, '.env.example'), 'utf8'), env));
  console.log(`  ${dim('secrets generated; database and payment keys come next (docs/SETUP.md)')}`);

  step('Committing');
  git(dir, 'add', 'public/brand', 'brand');
  if (git(dir, 'status', '--porcelain')) {
    git(dir, 'commit', '--quiet', '-m', `Set up ${config.name}`);
    console.log(`  ${green('✓')} "Set up ${config.name}"`);
  } else {
    console.log('  nothing to commit (no logo or texts)');
  }

  if (config.createGithubRepo) {
    step('Creating the GitHub repo');
    execFileSync('gh', ['repo', 'create', config.slug, '--private', '--source', dir, '--remote', 'origin', '--push'], {
      stdio: 'inherit',
    });
  } else if (config.githubRepo) {
    step(`Pushing to ${config.githubRepo}`);
    git(dir, 'remote', 'add', 'origin', config.githubRepo);
    execFileSync('git', ['push', '-u', 'origin', 'main'], { cwd: dir, stdio: 'inherit' });
  }

  if (config.install) {
    step('Installing dependencies (a few minutes)');
    execFileSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: dir, stdio: 'inherit' });
  }

  console.log(`\n${green('✓')} ${bold(`${config.name} is ready in ${dir}`)}\n`);
  console.log(bold('Next steps') + dim('  (details in docs/SETUP.md)'));
  const next = [
    config.install ? null : 'npm install',
    'Create the database and put DATABASE_URL in .env, then: npx prisma migrate deploy',
    'npm run dev  → open http://localhost:3000 and check the look',
    config.createGithubRepo || config.githubRepo ? null : 'Create a GitHub repo and push: git remote add origin <url> && git push -u origin main',
    'Deploy on Vercel and add the .env values there',
    'Optional: Google login, Stripe, PayPal, Resend, UploadThing keys',
  ].filter(Boolean);
  next.forEach((line, i) => console.log(`  ${i + 1}. ${line}`));
  console.log(`\n  Tip: in Claude Code, run ${bold('/new-shop')} to be guided through all of it.\n`);
}

// ── Main ─────────────────────────────────────────────────────────────────

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]);
  process.exit(0);
}

try {
  const config = validate(args.config ? JSON.parse(readFileSync(args.config, 'utf8')) : await interview());
  await createShop(config);
} catch (error) {
  console.error(`\n${yellow('✗')} ${error.message}`);
  process.exit(1);
}
