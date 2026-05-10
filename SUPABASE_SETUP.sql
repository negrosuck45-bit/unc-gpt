-- ============================================================
--  uncgpt — Supabase setup for chat image uploads
--  Run this in: Supabase Dashboard → SQL Editor → New Query
--  (You do NOT run SQL on Vercel. Vercel only hosts the app.)
-- ============================================================

-- 1) Create a public bucket for chat uploads.
--    Public = the generated URLs work without a signed-URL step.
insert into storage.buckets (id, name, public)
values ('chat-uploads', 'chat-uploads', true)
on conflict (id) do update set public = true;

-- 2) RLS policies on storage.objects so anyone can upload + read
--    objects in this single bucket. Tighten later if you add auth.
--    (RLS is already enabled on storage.objects by default.)

drop policy if exists "chat_uploads_public_read"  on storage.objects;
drop policy if exists "chat_uploads_anon_insert"  on storage.objects;
drop policy if exists "chat_uploads_anon_update"  on storage.objects;
drop policy if exists "chat_uploads_anon_delete"  on storage.objects;

create policy "chat_uploads_public_read"
  on storage.objects for select
  using ( bucket_id = 'chat-uploads' );

create policy "chat_uploads_anon_insert"
  on storage.objects for insert
  with check ( bucket_id = 'chat-uploads' );

create policy "chat_uploads_anon_update"
  on storage.objects for update
  using ( bucket_id = 'chat-uploads' )
  with check ( bucket_id = 'chat-uploads' );

create policy "chat_uploads_anon_delete"
  on storage.objects for delete
  using ( bucket_id = 'chat-uploads' );

-- Done. Now grab your project URL + anon key from
--   Supabase → Project Settings → API
-- and paste them into .env.local (see .env.local.example).
