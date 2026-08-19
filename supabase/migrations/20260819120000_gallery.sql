-- ==========================================================
-- galleries / gallery_items: galería privada de fotos y vídeos
-- por taller/jornada. Sin lectura pública por RLS — la página
-- pública /galeria/[slug] se genera en build time con la
-- service-role key (ver src/lib/supabaseAdmin.ts), así que la
-- anon key nunca necesita acceso de lectura a estas tablas.
-- ==========================================================
create table public.galleries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  event_date date not null default current_date,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('photo', 'video')),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index gallery_items_gallery_id_idx on public.gallery_items (gallery_id);

alter table public.galleries enable row level security;
alter table public.gallery_items enable row level security;

create policy "Los admins gestionan las galerías"
  on public.galleries for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Los admins gestionan los archivos de galería"
  on public.gallery_items for all
  using (public.is_admin())
  with check (public.is_admin());

-- ==========================================================
-- Storage: bucket público gallery-media (lectura pública por
-- URL directa, escritura solo admin)
-- ==========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gallery-media', 'gallery-media', true, 209715200,
  array['image/jpeg','image/png','image/webp','image/heic','video/mp4','video/quicktime','video/webm']
)
on conflict (id) do nothing;

create policy "Los admins suben archivos a gallery-media"
  on storage.objects for insert
  with check (bucket_id = 'gallery-media' and public.is_admin());

create policy "Los admins actualizan archivos de gallery-media"
  on storage.objects for update
  using (bucket_id = 'gallery-media' and public.is_admin())
  with check (bucket_id = 'gallery-media' and public.is_admin());

create policy "Los admins borran archivos de gallery-media"
  on storage.objects for delete
  using (bucket_id = 'gallery-media' and public.is_admin());
