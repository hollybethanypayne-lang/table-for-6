import {NextResponse} from 'next/server';import {requireUser} from '@/lib/supabase/server';import {discovery,challenge,verifier,clientId} from '@/lib/shopify/customer';
export async function GET(request:Request){const ctx=await requireUser();if(!ctx)return NextResponse.redirect(new URL('/auth/sign-in',request.url));try{
 const d=await discovery(),v=verifier(),state=verifier(),nonce=verifier();const base=new URL(request.url).origin;const url=new URL(d.authorization_endpoint);
 for(const [k,x] of Object.entries({client_id:clientId(),scope:'openid email customer-account-api:full',response_type:'code',redirect_uri:`${base}/api/shopify/callback`,state,nonce,code_challenge:challenge(v),code_challenge_method:'S256'}))url.searchParams.set(k,x);
 const res=NextResponse.redirect(url);const opts={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,maxAge:600,path:'/api/shopify'};
 res.cookies.set('shop_pkce',v,opts);res.cookies.set('shop_state',state,opts);res.cookies.set('shop_nonce',nonce,opts);res.cookies.set('shop_actor',ctx.userId,opts);return res;
 }catch{return NextResponse.redirect(new URL('/app/account?shopify=configuration-error',request.url));}}
