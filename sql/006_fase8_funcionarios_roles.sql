-- FASE 8 - Funcionarios, roles y permisos
create table if not exists public.funcionarios_foest (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  nombre text not null, correo text not null unique, cargo text not null,
  rol text not null default 'FUNCIONARIO' check (rol in ('SUPERADMIN','FUNCIONARIO')),
  activo boolean not null default true, permisos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.funcionarios_foest enable row level security;
-- El backend usa service_role después de validar el JWT; no se crean políticas públicas.
create unique index if not exists unico_superadmin_foest on public.funcionarios_foest ((rol)) where rol='SUPERADMIN';
