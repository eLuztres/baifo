#!/usr/bin/env node
// Copies the filled-in values of .env to the linked Vercel project (run `vercel link` first).
//   npm run push-env                      # production + preview
//   npm run push-env -- --only STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET
// Values go to the CLI on stdin, so they never show up in the shell history or process list.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import nextEnv from '@next/env';

// Vercel's Neon integration sets these itself; localhost values make no sense online.
const SKIP = new Set(['DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'AUTH_TRUST_HOST']);
const TARGETS = ['production', 'preview'];
const SECRET = /SECRET|KEY|TOKEN|PASSWORD/;

if (!existsSync('.vercel/project.json')) {
  console.error('Not linked to a Vercel project yet. Run `vercel link` in this folder first.');
  process.exit(1);
}

const onlyIndex = process.argv.indexOf('--only');
const only = onlyIndex > -1 ? new Set(process.argv[onlyIndex + 1]?.split(',').map((k) => k.trim())) : null;

const { parsedEnv } = nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });
const env = Object.entries(parsedEnv ?? {}).filter(
  ([key, value]) => value !== '' && !SKIP.has(key) && (!only || only.has(key))
);

if (env.length === 0) {
  console.log('Nothing to push.');
  process.exit(0);
}

const warnings = [];
for (const [key, value] of env) {
  if (/localhost|127\.0\.0\.1/.test(value)) {
    warnings.push(`${key} points to localhost and was skipped`);
    continue;
  }
  for (const target of TARGETS) {
    const args = ['env', 'add', key, target, '--force'];
    if (SECRET.test(key)) args.push('--sensitive');
    const result = spawnSync('vercel', args, { input: value, encoding: 'utf8' });
    const ok = result.status === 0;
    console.log(`${ok ? '✓' : '✗'} ${key} → ${target}${ok ? '' : `: ${(result.stderr || result.stdout).trim().split('\n').pop()}`}`);
  }
}

warnings.forEach((w) => console.log(`⚠ ${w}: set the production value in .env and push again, or set it in Vercel.`));
console.log('\nRedeploy for the new values to take effect: vercel --prod');
