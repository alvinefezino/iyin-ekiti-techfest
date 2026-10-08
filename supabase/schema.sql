-- Iyin-Ekiti TechFest schema. Run once in the Supabase SQL editor (or as a migration).
create extension if not exists pgcrypto;

create table if not exists admins (user_id uuid primary key references auth.users(id) on delete cascade);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

create table if not exists pages (
  slug text primary key,
  title text not null,
  draft jsonb not null default '[]',
  published jsonb not null default '[]',
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists page_versions (
  id bigint generated always as identity primary key,
  slug text not null references pages(slug) on delete cascade,
  blocks jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  token uuid not null default gen_random_uuid(),
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create table if not exists broadcasts (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body text not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists hackathon_registrations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  team_name text,
  team_members jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  email text not null,
  full_name text not null,
  quantity int not null default 1,
  amount_kobo bigint not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  code text not null unique,
  checked_in_at timestamptz
);

insert into settings (key, value) values
  ('tickets_enabled', 'false'),
  ('event_date', '"2026-11-15T09:00:00+01:00"'),
  ('chatbot_knowledge', '""'),
  ('cookie_text', '"We use cookies to improve your experience."')
on conflict (key) do nothing;
insert into pages (slug, title) values ('home', 'Home') on conflict (slug) do nothing;

alter table admins enable row level security;
alter table pages enable row level security;
alter table page_versions enable row level security;
alter table settings enable row level security;
alter table subscribers enable row level security;
alter table broadcasts enable row level security;
alter table hackathon_registrations enable row level security;
alter table orders enable row level security;
alter table tickets enable row level security;

-- Public can read published content only (the draft column is hidden from anon)
revoke select on pages from anon;
grant select (slug, title, published, published_at, updated_at) on pages to anon;
create policy "pages_read" on pages for select using (true);
create policy "settings_read" on settings for select using (key <> 'chatbot_knowledge' or is_admin());

create policy "admin_pages" on pages for all using (is_admin()) with check (is_admin());
create policy "admin_versions" on page_versions for all using (is_admin()) with check (is_admin());
create policy "admin_settings" on settings for all using (is_admin()) with check (is_admin());
create policy "admin_subs" on subscribers for all using (is_admin()) with check (is_admin());
create policy "admin_broadcasts" on broadcasts for all using (is_admin()) with check (is_admin());
create policy "admin_regs" on hackathon_registrations for select using (is_admin());
create policy "admin_orders" on orders for select using (is_admin());
create policy "admin_tickets" on tickets for select using (is_admin());
create policy "admin_self" on admins for select using (user_id = auth.uid());

-- Public image bucket for admin uploads
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;
create policy "media_read" on storage.objects for select using (bucket_id = 'media');
create policy "media_admin_write" on storage.objects for insert with check (bucket_id = 'media' and is_admin());
create policy "media_admin_update" on storage.objects for update using (bucket_id = 'media' and is_admin());
create policy "media_admin_delete" on storage.objects for delete using (bucket_id = 'media' and is_admin());

-- After creating your admin user in Auth, run:
-- insert into admins (user_id) values ('PASTE-USER-UUID');
