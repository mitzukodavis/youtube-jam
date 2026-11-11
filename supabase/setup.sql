-- Demo pública: cualquier persona con el código de sala puede editarla.
-- No almacenar datos privados ni usarla como sistema de permisos de producción.
create table if not exists public.jam_rooms (
  id text primary key check (id ~ '^[A-Z0-9]{8}$'),
  current_index integer not null default 0,
  is_playing boolean not null default false,
  started_at timestamptz,
  position_seconds double precision not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.jam_videos (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.jam_rooms(id) on delete cascade,
  video_id text not null check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text not null default 'Video de YouTube',
  position integer not null,
  created_at timestamptz not null default now()
);
create index if not exists jam_videos_room_position_idx on public.jam_videos(room_id, position);
alter table public.jam_rooms enable row level security;
alter table public.jam_videos enable row level security;
-- Permisos abiertos adecuados SOLO para una demo con salas públicas.
create policy "demo_rooms_select" on public.jam_rooms for select to anon, authenticated using (true);
create policy "demo_rooms_insert" on public.jam_rooms for insert to anon, authenticated with check (true);
create policy "demo_rooms_update" on public.jam_rooms for update to anon, authenticated using (true) with check (true);
create policy "demo_videos_select" on public.jam_videos for select to anon, authenticated using (true);
create policy "demo_videos_insert" on public.jam_videos for insert to anon, authenticated with check (true);
create policy "demo_videos_update" on public.jam_videos for update to anon, authenticated using (true) with check (true);
create policy "demo_videos_delete" on public.jam_videos for delete to anon, authenticated using (true);
-- Habilitar eventos de cambios para las dos tablas.
do $$ begin
  alter publication supabase_realtime add table public.jam_rooms;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.jam_videos;
exception when duplicate_object then null; end $$;
