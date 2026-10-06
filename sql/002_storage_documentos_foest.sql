-- Fase 5: almacenamiento seguro de documentos.
-- El backend crea automáticamente el bucket privado "foest-documentos" al iniciar.
-- Este script solo deja documentada la configuración esperada.

comment on column documentos.archivo_url is
  'Ruta interna del archivo dentro del bucket privado de Supabase Storage; no es una URL pública.';
