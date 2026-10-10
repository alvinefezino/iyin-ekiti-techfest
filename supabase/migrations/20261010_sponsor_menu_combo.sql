-- Menu combo extension for sponsor_promo_payments
-- Run this in Supabase SQL Editor if you already applied schema.sql
alter table if exists sponsor_promo_payments add column if not exists items jsonb not null default '[]'::jsonb;
alter table if exists sponsor_promo_payments add column if not exists total_naira integer not null default 0;
