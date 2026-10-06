-- FOEST - Fase 6: revisión administrativa y trazabilidad
-- Ejecutar una sola vez en Supabase > SQL Editor antes de probar la Fase 6.

alter table public.documentos
  add column if not exists revisado_por text,
  add column if not exists revisado_en timestamptz;

alter table public.postulaciones
  add column if not exists revisado_por text,
  add column if not exists revisado_en timestamptz;

comment on column public.documentos.revisado_por is 'Funcionario que realizó la última revisión documental.';
comment on column public.documentos.revisado_en is 'Fecha/hora de la última revisión documental.';
comment on column public.postulaciones.revisado_por is 'Funcionario que realizó el último cambio de estado.';
comment on column public.postulaciones.revisado_en is 'Fecha/hora del último cambio de estado.';
