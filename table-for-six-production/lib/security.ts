import { NextResponse } from 'next/server';
import { requireUser } from './supabase/server';
export function jsonError(message:string, status=400) { return NextResponse.json({error:message},{status}); }
export async function paidMember() {
  const ctx=await requireUser();
  if(!ctx) return {error:jsonError('Sign in required',401)};
  const {data,error}=await ctx.supabase.rpc('has_active_membership');
  if(error || data!==true) return {error:jsonError('An active Shopify membership is required',403)};
  return {ctx};
}
