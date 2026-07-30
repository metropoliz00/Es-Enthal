-- Supabase Complete Schema for CBT & LCC TKA System

-- 1. Users table
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  password text not null,
  role text default 'siswa',
  fullname text,
  nama_lengkap text,
  gender text,
  jenis_kelamin text,
  school text,
  kelas_id text,
  kelas text,
  kecamatan text,
  active_exam text,
  session text,
  photo_url text,
  active_tp text,
  active_paket text,
  exam_type text,
  status text default 'OFFLINE',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Exams table
create table if not exists exams (
  id text primary key,
  nama_ujian text not null,
  waktu_mulai text,
  durasi integer default 60,
  token_akses text,
  is_active boolean default false,
  max_questions integer default 0
);

-- 3. Questions table
create table if not exists questions (
  id text primary key,
  exam_id text references exams(id) on delete cascade,
  text_soal text not null,
  tipe_soal text default 'Pilihan Ganda',
  bobot_nilai numeric default 1,
  gambar text,
  kelas text,
  tp_id text,
  caption text,
  jenis_ujian text
);

-- 4. Options table
create table if not exists options (
  id uuid default gen_random_uuid() primary key,
  question_id text references questions(id) on delete cascade,
  text_jawaban text not null,
  is_correct boolean default false
);

-- 5. Student Exams table
create table if not exists student_exams (
  id uuid default gen_random_uuid() primary key,
  user_id text references users(username) on delete cascade,
  exam_id text,
  status text default 'ongoing',
  waktu_submit timestamp with time zone default timezone('utc'::text, now()),
  nilai numeric default 0
);

-- 6. Answers table
create table if not exists answers (
  id uuid default gen_random_uuid() primary key,
  student_exam_id uuid references student_exams(id) on delete cascade,
  question_id text,
  option_id uuid
);

-- 7. School Schedules table
create table if not exists school_schedules (
  id uuid default gen_random_uuid() primary key,
  school text unique not null,
  wave text,
  session text,
  time_slot text
);

-- 8. App Config table
create table if not exists app_config (
  key text primary key,
  value text
);

-- 9. User Config table
create table if not exists user_config (
  id uuid default gen_random_uuid() primary key,
  username text,
  key text,
  value text,
  unique(username, key)
);

-- 10. Learning Objectives table
create table if not exists learning_objectives (
  id text primary key,
  mapel text,
  tp_code text,
  description text,
  kelas text
);

-- 11. External Grades table
create table if not exists external_grades (
  id uuid default gen_random_uuid() primary key,
  username text,
  mapel text,
  nilai numeric
);

-- 12. LCC Teams table
create table if not exists lcc_teams (
  id text primary key,
  name text not null,
  school text,
  score numeric default 0,
  color text default '#3b82f6',
  logo text,
  correct_count integer default 0,
  wrong_count integer default 0,
  members jsonb default '[]'::jsonb
);

-- 13. LCC Questions table
create table if not exists lcc_questions (
  id text primary key,
  nomor_soal integer,
  babak text,
  soal text,
  referensi_jawaban text,
  poin numeric default 100,
  kategori text
);

-- 14. LCC Config table
create table if not exists lcc_config (
  key text primary key,
  config jsonb not null
);

-- 15. LCC History table
create table if not exists lcc_history (
  id uuid default gen_random_uuid() primary key,
  timestamp text,
  team_id text,
  team_name text,
  points numeric,
  description text,
  delta numeric
);

-- Enable Row Level Security (RLS) optionally or leave open for public demo access
alter table users enable row level security;
alter table exams enable row level security;
alter table questions enable row level security;
alter table options enable row level security;
alter table student_exams enable row level security;
alter table answers enable row level security;
alter table school_schedules enable row level security;
alter table app_config enable row level security;
alter table user_config enable row level security;
alter table learning_objectives enable row level security;
alter table external_grades enable row level security;
alter table lcc_teams enable row level security;
alter table lcc_questions enable row level security;
alter table lcc_config enable row level security;
alter table lcc_history enable row level security;

create policy "Enable all access for anon on users" on users for all using (true) with check (true);
create policy "Enable all access for anon on exams" on exams for all using (true) with check (true);
create policy "Enable all access for anon on questions" on questions for all using (true) with check (true);
create policy "Enable all access for anon on options" on options for all using (true) with check (true);
create policy "Enable all access for anon on student_exams" on student_exams for all using (true) with check (true);
create policy "Enable all access for anon on answers" on answers for all using (true) with check (true);
create policy "Enable all access for anon on school_schedules" on school_schedules for all using (true) with check (true);
create policy "Enable all access for anon on app_config" on app_config for all using (true) with check (true);
create policy "Enable all access for anon on user_config" on user_config for all using (true) with check (true);
create policy "Enable all access for anon on learning_objectives" on learning_objectives for all using (true) with check (true);
create policy "Enable all access for anon on external_grades" on external_grades for all using (true) with check (true);
create policy "Enable all access for anon on lcc_teams" on lcc_teams for all using (true) with check (true);
create policy "Enable all access for anon on lcc_questions" on lcc_questions for all using (true) with check (true);
create policy "Enable all access for anon on lcc_config" on lcc_config for all using (true) with check (true);
create policy "Enable all access for anon on lcc_history" on lcc_history for all using (true) with check (true);
