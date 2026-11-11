# Shopify setup (QueerMCR, existing store)

Nothing has been changed in the connected Shopify store by this build.

1. Confirm customer accounts are enabled, and provision a Customer Account API client with `https://app.queermcr.co.uk/api/shopify/callback` as an authorised redirect (include local development callback for testing). Client type and allowed use depend on the selected Shopify setup.
2. Set `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` as a **server-side** variable and `NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN=queermcr.co.uk`.
3. Select a subscription provider (e.g. Shopify Subscriptions) supporting the desired weekly/monthly recurring selling plans and the necessary merchant-facing API/webhook access. Create and test the products only when ready; **no subscription products have been created**.
4. Configure signed Shopify contract and billing-attempt webhooks pointing to `https://app.queermcr.co.uk/api/shopify/webhooks`. Use the correct app webhook signing secret. The starter handler verifies HMAC and queues events, but **does not activate membership**.
5. Build a provider-authorized reconciliation worker for contract ownership, active status, invoices/billing attempts, cancellation and paid-through. Some subscription scopes apply only to contracts owned by the subscription app; a separate app cannot assume access to another app's contracts. Agree on the integration path with the subscription provider first.
6. Verify: new subscription, renewal, declined payment, grace period, cancellation, refund, duplicate webhook, out-of-order webhook, account relinking, unlinked customer, and member suspension.
7. Do not use customer email alone for joining membership records. Shopify customer GID must be linked through verified OAuth. The Customer Account callback checks both identity tokens and email.
8. For this Basic-plan Shopify store, do not assume Shopify Plus-only third-party identity provider features are available. This design uses a separate Supabase sign-in and verified Shopify account linking, not Shopify Plus SSO.

## Implementation references

- https://shopify.dev/docs/api/customer/latest
- https://shopify.dev/docs/apps/build/purchase-options/subscriptions
- https://shopify.dev/docs/apps/build/purchase-options/subscriptions/contracts
- https://shopify.dev/docs/apps/build/events-webhooks
