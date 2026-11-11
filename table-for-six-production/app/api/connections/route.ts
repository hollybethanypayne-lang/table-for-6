import {NextResponse} from 'next/server';import {z} from 'zod';import {paidMember,jsonError} from '@/lib/security';import {adminClient} from '@/lib/supabase/admin';
const schema=z.object({recipient_id:z.string().uuid(),intro:z.string().trim().max(500).optional()});
export async function POST(request:Request){const access=await paidMember();if(access.error)return access.error;const userId=access.ctx!.userId;const check=schema.safeParse(await request.json().catch(()=>null));if(!check.success||check.data.recipient_id===userId)return jsonError('Invalid request');const admin=adminClient();
 const [{data:recipient},{data:blocks},{data:existing}]=await Promise.all([
 admin.from('profiles').select('id,discoverable,age_verified,eligibility_confirmed_at,suspended_at').eq('id',check.data.recipient_id).maybeSingle(),
 admin.from('blocks').select('blocker_id').or(`and(blocker_id.eq.${userId},blocked_id.eq.${check.data.recipient_id}),and(blocker_id.eq.${check.data.recipient_id},blocked_id.eq.${userId})`).limit(1),
 admin.from('connections').select('id').or(`and(sender_id.eq.${userId},recipient_id.eq.${check.data.recipient_id}),and(sender_id.eq.${check.data.recipient_id},recipient_id.eq.${userId})`).limit(1)
 ]);
 if(!recipient?.discoverable||!recipient.age_verified||!recipient.eligibility_confirmed_at||recipient.suspended_at)return jsonError('Unavailable profile',404);
 if(blocks?.length||existing?.length)return jsonError('Request not available',409);
 const {data:recipientMembership}=await admin.from('memberships').select('id').eq('user_id',check.data.recipient_id).eq('status','active').gt('paid_through',new Date().toISOString()).limit(1);
 if(!recipientMembership?.length)return jsonError('Unavailable profile',404);
 const {error}=await admin.from('connections').insert({sender_id:userId,recipient_id:check.data.recipient_id,intro:check.data.intro||null});if(error)return jsonError('Could not create request',409);return NextResponse.json({ok:true},{status:201});
}
