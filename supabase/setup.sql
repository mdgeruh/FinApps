-- ============================================================
-- Keuangan Pribadi: setup tabel sinkron + Row Level Security (RLS)
-- Jalankan di Supabase Dashboard -> SQL Editor.
-- Aman dijalankan ulang (idempoten). BACA dulu kalau tabel `app_data` sudah berisi data:
-- skrip ini tidak menghapus baris, hanya memastikan struktur & kebijakan akses.
-- Kolom yang dipakai kode (src/js/features/data/sync.js): user_id, data, version, updated_at.
-- ============================================================

create table if not exists public.app_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null,
  version    integer     not null default 1,
  updated_at timestamptz not null default now()
);

-- WAJIB: tanpa ini anon key (yang publik di src/js/core/config.js) bisa membaca semua baris.
alter table public.app_data enable row level security;
alter table public.app_data force row level security;

-- Hapus kebijakan lama dengan nama sama supaya skrip bisa dijalankan ulang.
drop policy if exists "app_data_select_own" on public.app_data;
drop policy if exists "app_data_insert_own" on public.app_data;
drop policy if exists "app_data_update_own" on public.app_data;
drop policy if exists "app_data_delete_own" on public.app_data;

-- Tiap pengguna hanya boleh menyentuh barisnya sendiri.
create policy "app_data_select_own" on public.app_data
  for select to authenticated using (user_id = auth.uid());

create policy "app_data_insert_own" on public.app_data
  for insert to authenticated with check (user_id = auth.uid());

create policy "app_data_update_own" on public.app_data
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "app_data_delete_own" on public.app_data
  for delete to authenticated using (user_id = auth.uid());

-- Pengguna belum login (role anon) tidak boleh akses sama sekali.
revoke all on public.app_data from anon;
grant select, insert, update, delete on public.app_data to authenticated;

-- ============================================================
-- VERIFIKASI (jalankan terpisah setelah skrip di atas):
--   1) RLS aktif:
--        select relname, relrowsecurity, relforcerowsecurity from pg_class where relname = 'app_data';
--      -> relrowsecurity dan relforcerowsecurity harus true.
--   2) Kebijakan terpasang (harus ada 4):
--        select policyname, cmd, roles from pg_policies where tablename = 'app_data';
--   3) Uji dengan DUA akun: login akun A, simpan data; login akun B lalu jalankan di konsol browser
--        supabase.from('app_data').select('user_id')   -> hanya boleh mengembalikan baris akun B.
-- ============================================================
