-- Livro-caixa: rode este arquivo uma vez no SQL Editor do Supabase.

create table public.categorias (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome       text not null check (char_length(nome) between 1 and 60),
  tipo       text not null check (tipo in ('entrada', 'saida')),
  created_at timestamptz not null default now(),
  unique (user_id, tipo, nome)
);

create table public.lancamentos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tipo            text not null check (tipo in ('entrada', 'saida')),
  valor           numeric(12,2) not null check (valor > 0),
  categoria_id    uuid references public.categorias(id) on delete set null,
  descricao       text check (char_length(descricao) <= 120),
  data            date not null default current_date,
  forma_pagamento text,
  created_at      timestamptz not null default now()
);

create index lancamentos_user_data_idx on public.lancamentos (user_id, data);

-- Segurança: cada usuário só enxerga e altera as próprias linhas.
alter table public.categorias  enable row level security;
alter table public.lancamentos enable row level security;

create policy "categorias: dono" on public.categorias
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "lancamentos: dono" on public.lancamentos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
