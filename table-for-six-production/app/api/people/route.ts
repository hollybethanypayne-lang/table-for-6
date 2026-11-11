import {NextResponse} from 'next/server';import {paidMember,jsonError} from '@/lib/security';
export async function GET(){const result=await paidMember();if(result.error)return result.error;const ctx=result.ctx!;
 const {data,error}=await ctx.supabase.from('discoverable_people').select('id,display_name,bio,age_band,city_area,interests,friendship_goals,avatar_url').neq('id',ctx.userId).limit(50);
 if(error)return jsonError('Could not load people',500);
 const {data:blocked}=await ctx.supabase.from('blocks').select('blocked_id').eq('blocker_id',ctx.userId);
 const excluded=new Set((blocked||[]).map(x=>x.blocked_id));
 // View RLS filters out blocked pairs from profile reads, too; this is an extra privacy filter.
 return NextResponse.json({people:(data||[]).filter(p=>!excluded.has(p.id))},{headers:{'cache-control':'no-store'}});
}
