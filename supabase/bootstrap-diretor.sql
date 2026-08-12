-- Rode este arquivo depois de criar o usuario do diretor em Authentication > Users.
-- Troque o e-mail abaixo pelo e-mail usado no cadastro do diretor.
-- Nao coloque senha neste arquivo. A senha pertence apenas ao Supabase Auth.

create extension if not exists "pgcrypto";

create table if not exists public.academias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  criado_em timestamptz not null default now()
);

alter table public.profiles
  add column if not exists academia_id uuid;

with academia as (
  insert into public.academias (nome)
  values ('Simao Tavares Top Team')
  on conflict (nome) do update set nome = excluded.nome
  returning id
)
insert into public.profiles (id, nome, cargo, academia_id)
select
  auth.users.id,
  'Mestre Simao',
  'diretor',
  academia.id
from auth.users
cross join academia
where auth.users.email = 'simaovalentina123@gmail.com'
on conflict (id) do update
set nome = excluded.nome,
    cargo = excluded.cargo,
    academia_id = excluded.academia_id;
