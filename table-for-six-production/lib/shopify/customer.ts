import 'server-only';
import {createHash,randomBytes} from 'node:crypto';
import {jwtVerify,createRemoteJWKSet} from 'jose';

export const storeDomain=process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN||'queermcr.co.uk';
export const clientId=()=>{const id=process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID;if(!id)throw new Error('Missing Shopify Customer Account client ID');return id;};
export async function discovery(){
 const url=`https://${storeDomain}/.well-known/openid-configuration`;
 const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('Shopify discovery unavailable');
 const d=await r.json() as {authorization_endpoint:string;token_endpoint:string;jwks_uri:string;issuer:string};
 for(const link of [d.authorization_endpoint,d.token_endpoint,d.jwks_uri]){if(new URL(link).protocol!=='https:')throw new Error('Invalid Shopify discovery URL');}
 return d;
}
export function verifier(){return randomBytes(32).toString('base64url');}
export function challenge(value:string){return createHash('sha256').update(value).digest('base64url');}
export async function verifyIdentity(idToken:string,nonce:string){const d=await discovery();const {payload}=await jwtVerify(idToken,createRemoteJWKSet(new URL(d.jwks_uri)),{issuer:d.issuer,audience:clientId()});if(payload.nonce!==nonce)throw new Error('Shopify nonce mismatch');if(!payload.sub)throw new Error('Shopify subject missing');return payload;}
export async function customerAccountApiUrl(){const r=await fetch(`https://${storeDomain}/.well-known/customer-account-api`,{cache:'no-store'});if(!r.ok)throw new Error('Customer Account API discovery failed');const data=await r.json();const url=data.graphql_api||data.graphql_api_url||data?.endpoints?.graphql;if(typeof url!=='string'||!url.startsWith('https://'))throw new Error('Unsupported Customer Account API discovery response');return url;}
