-- Table for Six / QueerMCR. Run in a NEW Supabase project before connecting real members.
create extension if not exists pgcrypto;
create type public.member_status as enum ('active','past_due','paused','cancelled','expired');
create type public.join_status as enum ('requested','approved','declined','cancelled','attended','waitlisted');
create type public.connection_status as enum ('requested','accepted','declined');
create type public.chat_kind as enum ('direct','dinner','plan');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'New member' check (char_length(display_name) between 1 and 60),
 bio text not null default '' check (char_length(bio)<=500),
 age_band text check (age_band in ('18-24','25-29','30-34','35-39','40-49','50+')),
 city_area text, interests text[] not null default '{}', friendship_goals text[] not null default '{}',
 avatar_url text, discoverable boolean not null default false,
 age_verified boolean not null default false,
 eligibility_confirmed_at timestamptz, suspended_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.shopify_links (
 user_id uuid primary key references auth.users(id) on delete cascade,
 shopify_customer_gid text not null unique check (shopify_customer_gid like 'gid://shopify/Customer/%'),
 linked_at timestamptz not null default now()
);
create table public.memberships (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 shopify_contract_gid text not null unique,
 status public.member_status not null default 'expired',
 billing_interval text check (billing_interval in ('WEEK','MONTH')),
 paid_through timestamptz,
 shopify_updated_at timestamptz,
 checked_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create index memberships_by_user on public.memberships(user_id, status, paid_through);
create table public.questionnaire_answers (
 user_id uuid not null references auth.users(id) on delete cascade,
 question_key text not null,answer jsonb not null,
 updated_at timestamptz not null default now(),primary key(user_id,question_key)
);
create table public.blocks (
 blocker_id uuid not null references auth.users(id) on delete cascade,
 blocked_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),primary key(blocker_id,blocked_id),check(blocker_id<>blocked_id)
);
create table public.connections (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 status public.connection_status not null default 'requested',
 intro text check(char_length(intro)<=500),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(sender_id<>recipient_id),unique(sender_id,recipient_id)
);
create table public.plans (
 id uuid primary key default gen_random_uuid(),
 host_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(title) between 5 and 120),description text not null check(char_length(description) between 10 and 2000),
 category text not null, starts_at timestamptz not null, area text not null,
 meeting_details text, capacity integer not null check(capacity between 2 and 30),
 is_published boolean not null default false, created_at timestamptz not null default now()
);
create table public.plan_attendees (
 plan_id uuid not null references public.plans(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 status public.join_status not null default 'requested',created_at timestamptz not null default now(),
 primary key(plan_id,user_id)
);
create table public.dinner_sessions (
 id uuid primary key default gen_random_uuid(),starts_at timestamptz not null,
 booking_closes_at timestamptz not null,area text not null default 'Manchester',
 seats integer not null check(seats>0 and seats%6=0),
 status text not null default 'open' check(status in ('draft','open','matching','revealed','completed','cancelled')),
 created_at timestamptz not null default now(),check(booking_closes_at<starts_at)
);
create table public.dinner_bookings (
 session_id uuid not null references public.dinner_sessions(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 status public.join_status not null default 'requested',
 created_at timestamptz not null default now(), primary key(session_id,user_id)
);
create table public.dinner_tables (
 id uuid primary key default gen_random_uuid(),session_id uuid not null references public.dinner_sessions(id) on delete cascade,
 venue_name text, venue_address text, approved_at timestamptz,
 capacity integer not null default 6 check(capacity=6)
);
create table public.dinner_table_members (
 table_id uuid not null references public.dinner_tables(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key(table_id,user_id)
);
create table public.chat_rooms (
 id uuid primary key default gen_random_uuid(),kind public.chat_kind not null,
 dinner_table_id uuid unique references public.dinner_tables(id) on delete cascade,
 plan_id uuid unique references public.plans(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table public.chat_members (
 room_id uuid not null references public.chat_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 joined_at timestamptz not null default now(),removed_at timestamptz,
 primary key(room_id,user_id)
);
create table public.messages (
 id uuid primary key default gen_random_uuid(),room_id uuid not null references public.chat_rooms(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(char_length(body) between 1 and 2000),
 created_at timestamptz not null default now(),deleted_at timestamptz
);
create index messages_room_time on public.messages(room_id,created_at desc);
create table public.safety_reports (
 id uuid primary key default gen_random_uuid(),reporter_id uuid not null references auth.users(id) on delete cascade,
 subject_id uuid references auth.users(id) on delete set null,
 message_id uuid references public.messages(id) on delete set null,
 category text not null, description text not null,
 status text not null default 'new', created_at timestamptz not null default now()
);
create table public.shopify_webhook_events (
 webhook_id text primary key,topic text not null,payload jsonb not null,received_at timestamptz not null default now(),handled_at timestamptz
);

-- Helper deliberately does NOT accept a member ID: can only evaluate authenticated caller.
create function public.has_active_membership() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships m join public.profiles p on p.id=m.user_id
 where m.user_id=(select auth.uid()) and exists(select 1 from public.shopify_links l where l.user_id=m.user_id) and m.status='active' and m.paid_through>now()
 and p.age_verified and p.eligibility_confirmed_at is not null and p.suspended_at is null);
$$;
revoke all on function public.has_active_membership() from public;
grant execute on function public.has_active_membership() to authenticated;

-- A stable owner-privileged predicate prevents membership RLS from hiding everyone
-- else's eligibility. No dates or subscription details are exposed to callers.
create function public.has_paid_discoverable_profile(other_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships m join public.shopify_links l on l.user_id=m.user_id
 where m.user_id=other_user and m.status='active' and m.paid_through>now());
$$;
revoke all on function public.has_paid_discoverable_profile(uuid) from public;
grant execute on function public.has_paid_discoverable_profile(uuid) to authenticated;
create function public.no_block_pair(other_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.blocks b where (b.blocker_id=(select auth.uid()) and b.blocked_id=other_user)
 or (b.blocker_id=other_user and b.blocked_id=(select auth.uid())));
$$;
revoke all on function public.no_block_pair(uuid) from public;
grant execute on function public.no_block_pair(uuid) to authenticated;

-- Expose only discoverable, eligible paid members; do not expose contact information or sensitive answers.
create view public.discoverable_people with (security_invoker=true) as
 select id,display_name,bio,age_band,city_area,interests,friendship_goals,avatar_url from public.profiles
 where discoverable and age_verified and eligibility_confirmed_at is not null and suspended_at is null
 and public.has_paid_discoverable_profile(id) and public.no_block_pair(id);

alter table public.profiles enable row level security;
alter table public.shopify_links enable row level security;
alter table public.memberships enable row level security;
alter table public.questionnaire_answers enable row level security;
alter table public.blocks enable row level security;
alter table public.connections enable row level security;
alter table public.plans enable row level security;
alter table public.plan_attendees enable row level security;
alter table public.dinner_sessions enable row level security;
alter table public.dinner_bookings enable row level security;
alter table public.dinner_tables enable row level security;
alter table public.dinner_table_members enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;
alter table public.safety_reports enable row level security;
alter table public.shopify_webhook_events enable row level security;

-- A definer function is required here: blocks RLS only exposes the current user's outbound blocks,
-- but a member must also disappear from discovery if they blocked the viewer.
-- Profiles: clients can read their own full record. All discovery is via server-controlled API or invoker view.
create policy profile_select on public.profiles for select to authenticated using (id=(select auth.uid()) or (public.has_active_membership() and discoverable and age_verified and eligibility_confirmed_at is not null and suspended_at is null and public.no_block_pair(id)));
-- Members can modify only harmless fields. Age verification, eligibility, suspension must be server-admin only.
-- Field-level privileges limit direct UPDATE as well as user-controlled insert.
revoke insert,update,delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update(display_name,bio,age_band,city_area,interests,friendship_goals,avatar_url,discoverable,updated_at) on public.profiles to authenticated;
create policy profile_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy own_links on public.shopify_links for select to authenticated using(user_id=(select auth.uid()));
create policy own_memberships on public.memberships for select to authenticated using(user_id=(select auth.uid()));
create policy own_answers_read on public.questionnaire_answers for select to authenticated using(user_id=(select auth.uid()));
create policy own_answers_insert on public.questionnaire_answers for insert to authenticated with check(user_id=(select auth.uid()));
create policy own_answers_update on public.questionnaire_answers for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy own_blocks on public.blocks for select to authenticated using(blocker_id=(select auth.uid()));
create policy insert_blocks on public.blocks for insert to authenticated with check(blocker_id=(select auth.uid()));
create policy delete_blocks on public.blocks for delete to authenticated using(blocker_id=(select auth.uid()));
-- Connections are inserted/accepted via server APIs using service role with explicit checks.
create policy connection_read on public.connections for select to authenticated using(sender_id=(select auth.uid()) or recipient_id=(select auth.uid()));
create policy plans_read on public.plans for select to authenticated using((is_published and public.has_active_membership()) or host_id=(select auth.uid()));
create policy plan_attendee_read on public.plan_attendees for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.plans p where p.id=plan_id and p.host_id=(select auth.uid())));
create policy dinner_sessions_read on public.dinner_sessions for select to authenticated using(public.has_active_membership() and status<>'draft');
create policy dinner_bookings_read on public.dinner_bookings for select to authenticated using(user_id=(select auth.uid()));
create policy dinner_tables_read on public.dinner_tables for select to authenticated using(approved_at is not null and exists(select 1 from public.dinner_table_members m where m.table_id=id and m.user_id=(select auth.uid())));
create policy own_table_members on public.dinner_table_members for select to authenticated using(user_id=(select auth.uid()));
create policy rooms_read on public.chat_rooms for select to authenticated using(exists(select 1 from public.chat_members m where m.room_id=id and m.user_id=(select auth.uid()) and m.removed_at is null));
create function public.is_chat_member(target_room uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.chat_members m where m.room_id=target_room and m.user_id=(select auth.uid()) and m.removed_at is null) $$;
revoke all on function public.is_chat_member(uuid) from public; grant execute on function public.is_chat_member(uuid) to authenticated;
create policy members_read on public.chat_members for select to authenticated using(public.is_chat_member(room_id));
create policy messages_read on public.messages for select to authenticated using(public.has_active_membership() and exists(select 1 from public.chat_members m where m.room_id=messages.room_id and m.user_id=(select auth.uid()) and m.removed_at is null));
create policy messages_write on public.messages for insert to authenticated with check(sender_id=(select auth.uid()) and public.has_active_membership() and exists(select 1 from public.chat_members m where m.room_id=messages.room_id and m.user_id=(select auth.uid()) and m.removed_at is null) and not exists(select 1 from public.chat_members m join public.blocks b on (b.blocker_id=(select auth.uid()) and b.blocked_id=m.user_id) or (b.blocked_id=(select auth.uid()) and b.blocker_id=m.user_id) where m.room_id=messages.room_id));
-- Reports inserted through authenticated API; no client read access to others' reports.
create policy own_reports on public.safety_reports for select to authenticated using(reporter_id=(select auth.uid()));
create policy report_create on public.safety_reports for insert to authenticated with check(reporter_id=(select auth.uid()));

-- No RLS policies on webhook events = server/service-role only.
-- Avoid granting INSERT/UPDATE on membership or Shopify identity tables to clients.
-- New auth.users rows create private profile (no discovery until explicit approval).
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id,display_name) values(new.id,'New member');return new;end;$$;
create trigger create_profile after insert on auth.users for each row execute procedure public.handle_new_user();
