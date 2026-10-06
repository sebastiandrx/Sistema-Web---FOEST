-- FASE 7 - Vincular perfiles existentes con Supabase Auth
alter table public.usuarios add column if not exists auth_user_id uuid unique;
alter table public.usuarios alter column password drop not null;
create unique index if not exists idx_usuarios_documento_unique on public.usuarios(documento);
create unique index if not exists idx_usuarios_correo_unique on public.usuarios(lower(correo));
-- Después de migrar todas las cuentas antiguas y validar Auth, la columna password puede eliminarse.
