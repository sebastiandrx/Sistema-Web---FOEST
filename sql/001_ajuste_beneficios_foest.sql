-- Ejecutar en Supabase SQL Editor.
-- Permite conservar la línea de formación y la condición especial de reintegro.

alter table postulaciones
  add column if not exists linea_formacion text;

alter table postulaciones
  add column if not exists condicion_reintegro text;

comment on column postulaciones.linea_formacion is 'LINEA_1 a LINEA_6 cuando se solicita Incentivos a la formación.';
comment on column postulaciones.condicion_reintegro is 'Condición de transición aplicable al reintegro.';


alter table postulaciones
  add column if not exists nivel_academico text;

comment on column postulaciones.nivel_academico is 'PREGRADO o POSGRADO; permite validar condiciones como Igualdad Asertiva.';
