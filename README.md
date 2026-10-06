# FOEST Sistema Demo - Fase 5

## Novedad principal
Los documentos ya no se conservan como archivos permanentes en el PC. El servidor los recibe temporalmente y los sube a un bucket privado de Supabase Storage.

## Configuración
Crea `.env` en la raíz:

```env
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_KEY=TU_CLAVE_PRIVADA_SOLO_BACKEND
SUPABASE_STORAGE_BUCKET=foest-documentos
```

La clave privada debe permanecer únicamente en el servidor y nunca en `public/`.

## Ejecutar

```powershell
npm install
npm start
```

Al iniciar, el servidor intenta crear el bucket privado `foest-documentos` si todavía no existe.

## Flujo de documentos
1. El estudiante selecciona los beneficios.
2. El sistema calcula los documentos requeridos.
3. El servidor valida nuevamente los requisitos.
4. Los archivos llegan temporalmente a `uploads_tmp/`.
5. Se suben al bucket privado de Supabase Storage.
6. Se elimina la copia temporal del PC.
7. En `documentos.archivo_url` se guarda la ruta interna del Storage.
8. El panel administrativo solicita un enlace firmado temporal para visualizar el documento.

Los enlaces de visualización duran 10 minutos y no hacen público el bucket.

## Fase 6 - Panel administrativo y revisión

Antes de ejecutar esta versión, abre **Supabase > SQL Editor** y ejecuta `sql/003_fase6_revision_administrativa.sql`.

Novedades principales:
- filtros por tipo, estado, beneficio/línea y universidad;
- ficha completa del expediente;
- revisión documental con observación, revisor y fecha;
- estados `PENDIENTE`, `EN REVISIÓN`, `SUBSANACIÓN`, `APROBADO` y `NO APROBADO`;
- bloqueo en backend: una postulación no puede aprobarse si algún documento no está aprobado;
- historial visible en el expediente;
- tarjetas de seguimiento en el dashboard;
- nombres legibles para beneficios y líneas.

> Esta fase conserva el acceso administrativo de demostración. La autenticación real, roles y RLS se abordarán en la siguiente fase de seguridad.


## Fase 6.2 - Catálogo de universidades
El campo Universidad ahora es una lista desplegable normalizada con 60 instituciones. Se eliminaron duplicados, espacios sobrantes y variantes ortográficas del histórico.


## Fase 6.3 - Buscador de universidades
El catálogo de universidades ahora usa un selector buscable con lupa. Filtra en tiempo real, ignora mayúsculas y tildes, y exige seleccionar una institución del catálogo.


## Fase 6.4 - Exportación Excel
En Admin > Reportes se agregó **Exportar a Excel**. El backend genera `FOEST_Reporte_YYYY-MM-DD.xlsx` con hojas Resumen, Postulaciones, Beneficios, Documentos e Historial. Requiere la dependencia `exceljs`, incluida en package.json.


## Fase 6.5 - Calculadora de promedio
Se agregó una calculadora compacta de promedio ponderado por créditos únicamente en la vista administrativa de revisión documental. Permite ingresar créditos y nota por materia, agregar/quitar filas y calcula el promedio ponderado automáticamente.


## Fase 6.5.1 - Corrección calculadora
La calculadora ya no usa un observador global. Solo se monta al abrir la revisión documental. Los créditos ahora usan enteros positivos (`min=1`, `step=1`) y la validación rechaza decimales.


## Fase 7 - Seguridad y Supabase Auth
Registro con verificación OTP por correo, login con contraseña gestionada por Supabase Auth y recuperación mediante OTP. Ejecutar `sql/005_fase7_supabase_auth.sql` y seguir `FASE7_CONFIGURACION_SUPABASE.md`.


## Fase 7.1 - Confirmación por enlaces
Se retiró la captura de códigos OTP. Registro y recuperación usan enlaces de confirmación de Supabase (`ConfirmationURL`).


## Fase 7.1.7 - Universidades FOEST
El selector y la validación del servidor quedaron restringidos a las 19 instituciones suministradas en el listado oficial compartido para esta fase.

## Fase 8 - Administración de funcionarios
Se reemplazó el acceso demo fijo del administrador por Supabase Auth. Existe un único SUPERADMIN, gestión de funcionarios, permisos, activación/desactivación, cambio de contraseña y autorización backend por JWT. Ver `FASE8_CONFIGURACION_ADMIN.md`.
