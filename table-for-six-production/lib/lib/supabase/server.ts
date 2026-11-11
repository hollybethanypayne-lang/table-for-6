import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function createClient() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() { return store.getAll(); },
      setAll(items: { name: string; value: string; options?: CookieOptions }[]) { try { items.forEach(({name,value,options}) => store.set(name,value,options)); } catch { /* read-only server component */ } }
    }
  });
}

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return { supabase, userId: data.claims.sub as string, claims: data.claims };
}
