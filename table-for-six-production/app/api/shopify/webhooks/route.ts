import {createHmac,timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';import {adminClient} from '@/lib/supabase/admin';

// Webhook intake is authentication + de-duplication + staging; it does NOT grant access.
// Entitlements must be reconciled against subscription provider and verified billing status.
export async function POST(request:Request){const secret=process.env.SHOPIFY_WEBHOOK_SECRET;if(!secret)return NextResponse.json({error:'Not configured'},{status:503});
 const raw=Buffer.from(await request.arrayBuffer());if(raw.byteLength>1_000_000)return NextResponse.json({error:'Payload too large'},{status:413});
 const given=request.headers.get('x-shopify-hmac-sha256')||'';const provided=Buffer.from(given,'base64');const expected=createHmac('sha256',secret).update(raw).digest();
 if(provided.length!==expected.length||!timingSafeEqual(provided,expected))return NextResponse.json({error:'Invalid signature'},{status:401});
 const topic=request.headers.get('x-shopify-topic')||'';const hookId=request.headers.get('x-shopify-webhook-id')||'';
 if(!hookId)return NextResponse.json({error:'Missing delivery ID'},{status:400});
 if(!['subscription_contracts/create','subscription_contracts/update','subscription_billing_attempts/success','subscription_billing_attempts/failure'].includes(topic))return NextResponse.json({ok:true,ignored:true});
 try{const payload=JSON.parse(raw.toString('utf8'));const admin=adminClient();const {error}=await admin.from('shopify_webhook_events').insert({webhook_id:hookId,topic,payload});
 if(error){if(error.code==='23505')return NextResponse.json({ok:true,duplicate:true});return NextResponse.json({error:'Queue write failed'},{status:503});}
 // Follow-up worker reconciles against Shopify/provider before entitlement activation.
 return NextResponse.json({ok:true,queued:true});
 }catch{return NextResponse.json({error:'Invalid webhook'},{status:400});}}
