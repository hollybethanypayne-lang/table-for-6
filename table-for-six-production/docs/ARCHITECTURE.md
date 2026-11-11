# Table for Six — production architecture, iteration 1

## What actually runs

- **Next.js 16 app router**: branded UI, route handlers, authenticated pages and interactive starter screens.
- **Supabase Auth**: magic-link authentication via email; server checks verified JWT claims, cookie refresh in `proxy.ts`.
- **Supabase Postgres**: schema, privacy defaults, row-level-security policies, and membership gate via `has_active_membership()`.
- **Shopify Customer Account API**: identity-link route uses state, PKCE and nonce, verifies signed ID token using Shopify's JWKS, checks verified email against Supabase and queries customer GID. The linking flow requires merchant configuration and real testing.
- **Shopify webhooks**: HMAC-verified raw body, unique delivery IDs, event staging; **not yet entitlement activation**. Subscription provider permissions and verification still required.

## High-level data path

```text
Member -> Next.js route -> Supabase Auth JWT -> RLS-scoped DB
                     |-> paidMember() checks paid-through + identity eligibility
                     |-> customer account OAuth -> Shopify verified identity -> shopify_links
Shopify subscription app -> signed webhook -> private webhook event queue
                                  -> (not built) reconciliation worker -> memberships
```

## Trust boundaries

1. Browsers never receive a service-role API key, customer token or Shopify Admin token.
2. Profile/plan and connection API routes check verified user and membership before data access.
3. Age verification, eligibility, suspension, contract status and paid-through are server-managed only.
4. New accounts are not discoverable by default. No public profile API.
5. Member-created plans are **drafts requiring moderation**.
6. Messaging policy uses RLS chat membership + block checks; this starter has a sending endpoint but does not yet provision rooms or expose live chat UI.
7. Shopify webhook event queuing **must not** be confused with confirmed billing. Access remains disabled until verified paid-through is populated by a production reconciler.

## Secure production backlog (blocking release)

- Secure, provider-authorized reconciliation of subscription contracts with billing-attempt verification, end-date calculation, and paid-through renewal; idempotent replay, cancellation and failed payment tests.
- Age-assurance provider and organiser eligibility review; review equality/privacy obligations before collecting sensitive data.
- Complete account deletion, data export, rate limits and bot protection.
- Event approval and join-request transactions with capacity enforcement; host/attendee permissions.
- Dinner seat allocation and matching; repeat-pair exclusion, accessibility hard constraints, admin approval and restaurant confirmation.
- Acceptance/decline connection transitions and mutual-only direct-chat room provisioning.
- Room access revocation on blocked, expired or suspended accounts; moderation dashboard, abuse reports and emergency actions.
- Security tests and privacy impact assessment; policies, disclosure, audit retention and service terms.
- Official licensed Bogart and Maragsâ webfont files from the rights-holder; font families are referenced but files are not included.

## Database handling

Migration contains **no real member data**. Test in a new project before running on a production database. Running migrations does not migrate existing Shopify customer profiles. Service role key must only be set as a server runtime secret. When using RLS, avoid caching authenticated responses publicly.
