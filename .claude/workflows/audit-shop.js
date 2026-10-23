export const meta = {
  name: 'audit-shop',
  description: 'Audit the shop codebase by area against React best practices, composition patterns and repo conventions, then verify findings',
  phases: [
    { title: 'Audit', detail: 'one read-only auditor per area' },
    { title: 'Verify', detail: 'one skeptic per area re-checks every finding' },
  ],
}

const COMMON = `
You are auditing a Next.js 15 / React 19 / Prisma / next-auth e-commerce shop at /home/joe/EluztresRepos/shop-emlets (a customer clone of a white-label shop template; upstream remote = template).
READ-ONLY: do not edit, create or delete any file. Do not run git commands that change state, do not run prisma migrate/seed/db push, do not run "next build", do not start servers. You may run: grep/cat/sed/find, "npx tsc --noEmit", "npx jest <path>", "npx eslint <files>".
Reference rules (read the relevant parts, grep by rule id):
- /home/joe/EluztresRepos/shop-emlets/.claude/skills/vercel-react-best-practices/AGENTS.md (performance rules: async-*, bundle-*, server-*, client-*, rerender-*, rendering-*, js-*, advanced-*)
- /home/joe/EluztresRepos/shop-emlets/.claude/skills/vercel-composition-patterns/AGENTS.md (architecture-*, state-*, patterns-*, react19-*)
- The repo's AGENTS.md / CLAUDE.md conventions you were given (server actions in lib/actions return {success,message} via formatError; Zod in lib/validators.ts; i18n via getT()/useI18n with keys in ALL resources/*.json; theme tokens only, no hardcoded colors; kebab-case file names; @/ imports; explicit prop interfaces, no any; authorization on every protected route/action; no raw errors to users; money via round2 and fixed-2 strings; customer-specific things only in .env, public/brand/, brand/messages/).
Report only REAL, concrete issues you verified by reading the code (file + line). Prefer impactful items: bugs, security/authorization gaps, broken behaviour, waterfalls, client bundle bloat (e.g. three.js loaded eagerly), re-render problems, dead code, duplicated code, convention violations, confusing structure. Skip nitpicks and pure style preferences. Do not invent issues to fill a quota.
Also list TEST GAPS: concrete unit tests (pure functions, server actions with mocked prisma), component tests (React Testing Library, the repo has tests/utils/render-with-i18n.tsx and fixtures.ts) and e2e tests (Playwright in e2e/, read-only unless guarded by skipUnlessWritesAllowed) that are missing and worth writing.
Also write ARCHITECTURE NOTES: a concise, accurate description of how this area works (files, data flow, key decisions) usable for README documentation.
`

const AREAS = [
  { key: 'home', prompt: `AREA: the one-page home experience and header. Files: app/(root)/page.tsx, app/(root)/home-page.tsx, app/(root)/template.tsx, app/(root)/layout.tsx, app/(root)/store/page.tsx, app/(root)/taller/page.tsx, app/(root)/contact/page.tsx, components/shared/home/** (ring-space*, ring-3d-texture, ring-recipes, one-page*, store-section, workshop-section, contact-section, dark-room*, palm-silhouette, materials.ts), components/shared/header/** , components/shared/product/category-ring.tsx, product-ring.tsx, product-ring.module.css, use-ring-drag.ts, components/shared/genie-lamp.tsx, lamp-smoke.tsx, gold-leaf-background*, page-transition.module.css, page-header.tsx, brand-logo.tsx, contact-channels.tsx, footer.tsx. Pay special attention to: three.js bundle loading (bundle-dynamic-imports), global event listeners (client-event-listeners, passive listeners), effects that should be events, scroll/touch logic correctness on iOS Safari, duplicated scroll helpers, hydration issues, accessibility of the one-page navigation.` },
  { key: 'storefront', prompt: `AREA: storefront product browsing and cart UI. Files: components/shared/product/** except category-ring/product-ring/use-ring-drag (product-card, product-images, product-carousel, add-to-cart.tsx, addToCartButton.tsx, buyNowButton.tsx, reserve-button.tsx, product-price, rating), components/ProductMedia.tsx, components/shared/LoaderImage.tsx (+ module css), components/view-all-products-button.tsx, components/shared/pagination.tsx, components/shared/delete-dialog.tsx, components/shared/checkout-steps.tsx, hooks/useMedia.ts, hooks/useCartActions.ts, app/(root)/cart/**, app/(root)/search/page.tsx, app/(root)/product/[slug]/** (page, review-form, review-list). Look for duplicated add-to-cart/buy-now logic (composition-patterns), non-kebab-case files, server waterfalls (async-parallel), oversized client props (server-serialization), etc.` },
  { key: 'checkout', prompt: `AREA: checkout, orders, payments and email. Files: app/(root)/shipping-address/**, app/(root)/payment-method/**, app/(root)/place-order/**, app/(root)/order/[id]/** (incl. stripe-payment, stripe-payment-success, order-details-table), lib/actions/order.actions.ts, lib/actions/cart.actions.ts, lib/actions/reservation.actions.ts, lib/order-payment.ts, lib/paypal.ts, lib/reservation.ts, app/api/webhooks/stripe/route.ts, email/** (email-service.ts, index.tsx, purchase-receipt.tsx, templates, components). Focus on correctness of money handling, authorization (can a user see/pay another user's order? webhook signature checks?), race conditions in stock/reservation, idempotency of payment updates, error handling (no raw errors to users), and server-auth-actions.` },
  { key: 'admin-auth', prompt: `AREA: authentication, user account and admin. Files: auth.ts, auth.config.ts, middleware.ts, lib/auth-guard.ts, types/next-auth.d.ts, app/(auth)/**, app/user/**, app/admin/**, components/admin/** (product-form, product-studio, admin-search, description-from-info), lib/actions/user.actions.ts, lib/actions/product.actions.ts, lib/actions/review.actions.ts, lib/actions/studio.actions.ts, app/api/** (auth, studio/view, uploadthing), lib/uploadthing.ts, lib/encrypt.ts, components/shared/google-sign-in-button.tsx, components/shared/header/user-button.tsx. Focus on server-auth-actions (every server action/route that mutates or reads private data must check session + role), Zod validation of input, admin-only routes, password handling, oversized components (product-studio.tsx 639 lines, product-form 425 lines) that should be split, waterfalls in admin pages.` },
  { key: 'core', prompt: `AREA: core libraries, config, i18n, brand, layout and tooling. Files: lib/utils.ts, lib/validators.ts, lib/brand.ts, lib/constants/**, lib/i18n.ts, lib/i18n-server.ts, components/i18n-provider.tsx, components/ui/** (shadcn primitives: only flag real bugs, they are generated), hooks/use-toast.ts, db/prisma.ts, db/seed.ts, db/sample-data.ts, types/index.ts, app/layout.tsx, app/loading.tsx, app/not-found.tsx, next.config.ts, tailwind.config.ts, tsconfig.json, assets/styles/globals.css, resources/*.json vs brand/messages/*.json (check key parity: every key in resources/en.json present in all resources/*.json; unused keys), package.json (unused or misplaced dependencies, e.g. a dependency named "i", jest/ts-jest/@types/jest in dependencies instead of devDependencies, @types/react 18 with React 19, fontawesome next to lucide), scripts/*.mjs and scripts/.texttest.mjs, lib/studio/*.mjs, skills-lock.json, .agents/, .taste-skill/ (are they meant to be committed?). Check for dead code: exported functions/components never imported anywhere (verify with grep across the repo).` },
  { key: 'tests-docs', prompt: `AREA: test infrastructure and documentation. Files: jest.config.ts, jest.setup.ts, tests/** (run "npx jest" and explain each of the 5 currently failing tests precisely: product-media.test.tsx loader test, email-service.test.ts notification template, paypal.test.ts two tests (do they hit the real PayPal network?), checkout-forms.test.tsx PaymentMethodForm toast), playwright.config.ts, e2e/** (the home page became a one-page scroller with sections #home #store #taller #contact; /store /taller /contact now redirect to /#section; the store section shows a 3D category ring instead of a product grid; these e2e tests fail against the running dev server: auth sign-in error + link to sign up, sign-up mismatched passwords + invalid email (locator.fill timeout), cart empty visitor, i18n switching, navigation header links + 404 page, mobile menu navigates to shop. Read the specs and the current pages to explain why each fails and what the correct updated assertion is. A dev server is running at http://localhost:3000 and you may fetch pages with curl to inspect HTML; DO NOT run Playwright with E2E_ALLOW_WRITES), stories/** and .storybook/** (which shared components lack stories), README.md and docs/SETUP.md (what is outdated or missing vs the current code: one-page home, ring studio scripts, category art, tests, architecture). In TEST GAPS, propose the overall test plan: what to add per layer, and a Playwright project emulating iPhone (WebKit, devices['iPhone 13']) for the one-page scroll behaviour (note: installed Playwright browser revision may not match; chromium works via E2E_CHROMIUM_PATH=/usr/bin/google-chrome; check ~/.cache/ms-playwright for webkit revisions vs what playwright-core 1.53.1 expects in node_modules/playwright-core/browsers.json).` },
]

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'short unique slug' },
          file: { type: 'string' },
          line: { type: 'number' },
          category: { type: 'string', enum: ['bug', 'security', 'performance', 'react-rule', 'composition', 'convention', 'dead-code', 'duplication', 'dependency', 'structure', 'a11y', 'test-infra', 'docs'] },
          rule: { type: 'string', description: 'skill rule id or AGENTS.md rule, if any' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          description: { type: 'string' },
          evidence: { type: 'string', description: 'the code that shows the problem, short' },
          proposedFix: { type: 'string' },
          filesToTouch: { type: 'array', items: { type: 'string' } },
          risk: { type: 'string', enum: ['low', 'medium', 'high'], description: 'risk of the fix breaking behaviour' },
        },
        required: ['id', 'file', 'category', 'severity', 'description', 'proposedFix', 'filesToTouch', 'risk'],
      },
    },
    testGaps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          layer: { type: 'string', enum: ['unit', 'component', 'e2e', 'story'] },
          target: { type: 'string' },
          cases: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' },
        },
        required: ['layer', 'target', 'cases'],
      },
    },
    architectureNotes: { type: 'string' },
  },
  required: ['findings', 'testGaps', 'architectureNotes'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          isReal: { type: 'boolean' },
          worthFixing: { type: 'boolean', description: 'real AND the fix is clearly an improvement worth its risk' },
          reason: { type: 'string' },
          correctedFix: { type: 'string', description: 'better or safer fix if the proposed one is wrong/incomplete; empty otherwise' },
        },
        required: ['id', 'isReal', 'worthFixing', 'reason'],
      },
    },
    missedIssues: {
      type: 'array',
      description: 'important real issues in this area the auditor missed (same shape as findings, verified)',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' }, file: { type: 'string' }, line: { type: 'number' },
          category: { type: 'string' }, severity: { type: 'string' },
          description: { type: 'string' }, proposedFix: { type: 'string' },
          filesToTouch: { type: 'array', items: { type: 'string' } }, risk: { type: 'string' },
        },
        required: ['id', 'file', 'category', 'severity', 'description', 'proposedFix', 'filesToTouch'],
      },
    },
  },
  required: ['verdicts', 'missedIssues'],
}

const results = await pipeline(
  AREAS,
  (area) => agent(COMMON + '\n' + area.prompt, { label: `audit:${area.key}`, phase: 'Audit', schema: FINDINGS_SCHEMA }),
  (audit, area) => {
    if (!audit) return null
    if (!audit.findings.length) return { area: area.key, audit, verify: { verdicts: [], missedIssues: [] } }
    return agent(
      COMMON + `\nYou are an adversarial SKEPTIC for area "${area.key}". Below are findings from another auditor. For EACH finding, open the file and check the claim yourself. Mark isReal=false if the claim is wrong, already handled elsewhere, or speculative. Mark worthFixing=false if real but trivial, purely stylistic, or the fix is riskier than the benefit. Default to skepticism. If the proposed fix is wrong or incomplete, give correctedFix. Then briefly scan the area for important issues the auditor missed (only verified, significant ones).\n\nArea scope:\n${area.prompt}\n\nFINDINGS:\n${JSON.stringify(audit.findings, null, 1)}`,
      { label: `verify:${area.key}`, phase: 'Verify', schema: VERDICT_SCHEMA }
    ).then((verify) => ({ area: area.key, audit, verify }))
  }
)

return results.filter(Boolean).map((r) => {
  const verdicts = new Map((r.verify?.verdicts ?? []).map((v) => [v.id, v]))
  const confirmed = r.audit.findings
    .map((f) => ({ ...f, verdict: verdicts.get(f.id) }))
    .filter((f) => f.verdict ? f.verdict.isReal && f.verdict.worthFixing : true)
  const rejected = r.audit.findings.filter((f) => { const v = verdicts.get(f.id); return v && !(v.isReal && v.worthFixing) }).map((f) => ({ id: f.id, reason: verdicts.get(f.id).reason }))
  return { area: r.area, confirmed, missed: r.verify?.missedIssues ?? [], rejected, testGaps: r.audit.testGaps, architectureNotes: r.audit.architectureNotes }
})
