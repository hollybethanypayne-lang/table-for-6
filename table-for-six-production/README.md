# Table for Six by QueerMCR — production starter

**Status: production-oriented foundation, not a deployable public launch.**

This project starts the requested migration from the local HTML prototype to a Next.js + Supabase + Shopify web app. It includes protected authentication, real schema and row-level permissions, protected API routes, a verified Shopify identity-linking attempt, subscription webhook staging, and initial functional pages for discovery, plans and dinner requests.

## Run locally

```bash
npm install
cp .env.example .env.local
# Populate real secrets locally; never commit this file.
npm run dev
```

Visit `http://localhost:3000`. Without Supabase credentials, the public landing page renders, but sign-in and member features will not work.

## Supabase

1. Create a **new** Supabase project in the preferred UK/EU region. Configure a site URL and permitted redirect URL `http://localhost:3000/auth/callback` (and later production origin).
2. Apply `supabase/migrations/0001_core.sql` in the SQL editor or your migration pipeline. Review all SQL and permissions first.
3. Enable email OTP links and configure reliable transactional email delivery for production.
4. Populate `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in local environment (service-role value is secret and server-only).
5. New members are private, unverified and inactive. Authorised organiser checks, eligibility policy and billing reconciliation are required before anyone can use social features. Do **not** bypass these checks to ship faster.

## Shopify

See `docs/SHOPIFY_SETUP.md`. Customer Account OAuth is built as a linking route and requires a configured Shopify client and end-to-end merchant testing. Subscription webhook intake is verified and staged but billing reconciliation is **not built**, so it does not grant membership. This is intentional fail-closed behaviour.

## Prototype reference

The original QueerMCR HTML file is included as `reference/queermcr-prototype.html` for design parity. It contains sample local-only interactions; do not deploy it as a multi-user service.

## Official branding

Colours: `#FFF7E9` cream, `#242424` charcoal, `#F19EC1` pink, `#6290C8` blue, `#DCB8E4` lilac.

Typography: Bogart headings; Maragsâ accent type. These are specified by name with fallbacks; **licensed font files are intentionally not distributed**.

Logo: existing asset from QueerMCR's Shopify files CDN.

## Included now

- Signed-in member dashboard with membership-status warning.
- Editable private profile and opt-in discoverability.
- Server-protected people list and first-introduction request endpoint.
- Plans list and event draft creation submitted for moderation.
- Dinner sessions and request-to-join endpoint (not confirmed seats).
- Chat schema and protected message insertion; chat provisioning + UI pending.
- Shopify account linking using PKCE, state, nonce, verified signed ID token and customer GID lookup.
- Shopify subscription-event webhook signature validation and durable event staging.

## Not yet delivered

See `docs/ARCHITECTURE.md` for launch-blocking backlog. The project is **not** production complete: no live matching optimiser, no confirmed billing entitlements, no live chat experience, no matchmaking admin console, no moderation service, no full automated tests, and no production hosting.

## Source references

- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://shopify.dev/docs/api/customer/latest
- https://shopify.dev/docs/apps/build/purchase-options/subscriptions/contracts
