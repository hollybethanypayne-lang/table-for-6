import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';import {adminClient} from '@/lib/supabase/admin';import {clientId,discovery,verifyIdentity} from '@/lib/shopify/customer';
const fail=(url:string)=>NextResponse.redirect(new URL('/app/account?shopify=failed',url));
export async function GET(req:NextRequest){const resFail=fail(req.url);const code=req.nextUrl.searchParams.get('code'),state=req.nextUrl.searchParams.get('state');const v=req.cookies.get('shop_pkce')?.value,nonce=req.cookies.get('shop_nonce')?.value,expected=req.cookies.get('shop_state')?.value,actor=req.cookies.get('shop_actor')?.value;
 if(!code||!v||!nonce||!state||state!==expected||!actor)return resFail;
 const supabase=await createClient();const {data}=await supabase.auth.getUser();if(!data.user||data.user.id!==actor||!data.user.email_confirmed_at)return resFail;
 try{const cfg=await discovery(),form=new URLSearchParams({grant_type:'authorization_code',client_id:clientId(),code,code_verifier:v,redirect_uri:`${req.nextUrl.origin}/api/shopify/callback`});const r=await fetch(cfg.token_endpoint,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:form,cache:'no-store'});if(!r.ok)throw Error('Shopify token exchange failed');const token=await r.json() as {id_token?:string;access_token?:string};if(!token.id_token)throw Error('Missing ID token');
 const identity=await verifyIdentity(token.id_token,nonce);const email=typeof identity.email==='string'?identity.email.toLowerCase():'';
 if(identity.email_verified!==true||email!==data.user.email?.toLowerCase())throw Error('Shopify and Supabase verified email mismatch');
 // Shopify OIDC subject is a shopper subject, not guaranteed to be a Customer GID.
 // Query Customer Account API with customer-scoped access token to retrieve stable customer ID.
 if(!token.access_token)throw Error('Missing customer access token');
 const api=await fetch(`https://${process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN}/.well-known/customer-account-api`,{cache:'no-store'});if(!api.ok)throw Error('Account API unavailable');const config=await api.json();const endpoint=config.graphql_api||config.graphql_api_url||config?.endpoints?.graphql;if(typeof endpoint!=='string'||!endpoint.startsWith('https://'))throw Error('No Customer API endpoint');
 const customerRes=await fetch(endpoint,{method:'POST',headers:{authorization:token.access_token,'content-type':'application/json'},body:JSON.stringify({query:'query CustomerIdentity { customer { id emailAddress { emailAddress } } }'}),cache:'no-store'});if(!customerRes.ok)throw Error('Customer identity request failed');const body=await customerRes.json();if(body.errors?.length)throw Error('Customer API query failed');const gid=body.data?.customer?.id as string|undefined;const customerEmail=body.data?.customer?.emailAddress?.emailAddress as string|undefined;
 if(!gid?.startsWith('gid://shopify/Customer/')||customerEmail?.toLowerCase()!==email)throw Error('Customer identity mismatch');
 const admin=adminClient();const {error}=await admin.from('shopify_links').upsert({user_id:data.user.id,shopify_customer_gid:gid},{onConflict:'user_id'});if(error)throw error;
 const redirect=NextResponse.redirect(new URL('/app/account?shopify=linked',req.url));for(const k of ['shop_pkce','shop_state','shop_nonce','shop_actor'])redirect.cookies.set(k,'',{path:'/api/shopify',maxAge:0});return redirect;
 }catch{return resFail;}
}
