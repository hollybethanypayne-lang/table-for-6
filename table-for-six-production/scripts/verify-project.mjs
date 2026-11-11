import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd();
const required=[
 'app/page.tsx','app/auth/sign-in/page.tsx','app/auth/callback/route.ts',
 'app/app/people/page.tsx','app/app/plans/page.tsx','app/app/dinners/page.tsx',
 'app/api/shopify/connect/route.ts','app/api/shopify/callback/route.ts','app/api/shopify/webhooks/route.ts',
 'app/api/connections/route.ts','app/api/messages/route.ts','supabase/migrations/0001_core.sql',
 'docs/SHOPIFY_SETUP.md','docs/ARCHITECTURE.md','.env.example',
 'reference/queermcr-prototype.html'
];
required.forEach(file=>assert(fs.existsSync(path.join(root,file)),`Missing ${file}`));
const sql=fs.readFileSync(path.join(root,'supabase/migrations/0001_core.sql'),'utf8');
for(const token of ['enable row level security','has_active_membership','no_block_pair','has_paid_discoverable_profile','shopify_webhook_events','safety_reports'])assert(sql.includes(token),`SQL missing ${token}`);
const webhook=fs.readFileSync(path.join(root,'app/api/shopify/webhooks/route.ts'),'utf8');
for(const token of ['timingSafeEqual','createHmac','await request.arrayBuffer','webhook_id','payload'])assert(webhook.includes(token),`Webhook missing ${token}`);
const callback=fs.readFileSync(path.join(root,'app/api/shopify/callback/route.ts'),'utf8');
for(const token of ['verifyIdentity','shopify_customer_gid','email_confirmed_at','code_verifier'])assert(callback.includes(token),`Shopify callback missing ${token}`);
console.log(`Project structure check passed: ${required.length} required files and key security checks present.`);
console.log('This is NOT a TypeScript compile, database migration test, Shopify OAuth integration test or security audit.');
