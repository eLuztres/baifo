#!/usr/bin/env node
// Copies the filled-in values of .env to the linked Vercel project (run `vercel link` first).
//   npm run push-env                      # production + preview
//   npm run push-env -- --only STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET
// Uses the REST API: the CLI can only add one environment per call, which doubles every variable.
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import nextEnv from '@next/env';

// Vercel's Neon integration sets these itself; localhost values make no sense online.
const SKIP = new Set(['DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'AUTH_TRUST_HOST']);
const TARGETS = ['production', 'preview'];
const SECRET = /SECRET|KEY|TOKEN|PASSWORD/;
const CLI_AUTH_FILES = [
  path.join(os.homedir(), '.local/share/com.vercel.cli/auth.json'),
  path.join(os.homedir(), 'Library/Application Support/com.vercel.cli/auth.json'),
  path.join(os.homedir(), 'AppData/Roaming/com.vercel.cli/Data/auth.json'),
];

if (!existsSync('.vercel/project.json')) {
  console.error('Not linked to a Vercel project yet. Run `vercel link` in this folder first.');
  process.exit(1);
}

function readVercelToken() {
  if (process.env.VERCEL_TOKEN) return process.env.VERCEL_TOKEN;
  const authFile = CLI_AUTH_FILES.find((file) => existsSync(file));
  const token = authFile && JSON.parse(readFileSync(authFile, 'utf8')).token;
  if (!token) {
    console.error('No Vercel login found. Run `vercel login`, or set VERCEL_TOKEN.');
    process.exit(1);
  }
  return token;
}

const token = readVercelToken();
const { projectId, orgId } = JSON.parse(readFileSync('.vercel/project.json', 'utf8'));
const teamQuery = orgId?.startsWith('team_') ? `teamId=${orgId}` : '';

async function vercelApi(method, route, body) {
  const url = `https://api.vercel.com${route}${route.includes('?') ? '&' : '?'}${teamQuery}`;
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${response.status} ${(await response.text()).slice(0, 200)}`);
  return response.json();
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

const { envs: existing } = await vercelApi('GET', `/v10/projects/${projectId}/env`);
const warnings = [];
for (const [key, value] of env) {
  if (/localhost|127\.0\.0\.1/.test(value)) {
    warnings.push(`${key} points to localhost and was skipped: set the production value in .env and push again`);
    continue;
  }
  try {
    // Replace every production/preview entry of this key, including old per-environment pairs.
    const replaced = existing.filter(
      (entry) => entry.key === key && !entry.gitBranch && entry.target?.some((t) => TARGETS.includes(t))
    );
    if (replaced.some((entry) => entry.target.some((t) => !TARGETS.includes(t)))) {
      warnings.push(`${key} also has a Development value in Vercel and was skipped: change it in the dashboard`);
      continue;
    }
    for (const entry of replaced) await vercelApi('DELETE', `/v9/projects/${projectId}/env/${entry.id}`);
    const type = SECRET.test(key) ? 'sensitive' : 'encrypted';
    await vercelApi('POST', `/v10/projects/${projectId}/env`, { key, value, type, target: TARGETS });
    console.log(`✓ ${key} → ${TARGETS.join(' + ')}`);
  } catch (error) {
    console.log(`✗ ${key}: ${error.message}`);
  }
}

warnings.forEach((warning) => console.log(`⚠ ${warning}.`));
console.log('\nRedeploy for the new values to take effect: vercel --prod');
