# Fase 8 — Superadministrador, funcionarios y permisos

## 1. Ejecutar SQL
En Supabase > SQL Editor ejecuta `sql/006_fase8_funcionarios_roles.sql`.

## 2. Crear el único Superadministrador
Agrega temporalmente al `.env`:

FOEST_SUPERADMIN_EMAIL=correo_del_administrador
FOEST_SUPERADMIN_PASSWORD=una_password_segura_de_minimo_10_caracteres
FOEST_SUPERADMIN_NOMBRE=Nombre del administrador

Ejecuta una sola vez:

`node scripts/crear-superadmin.js`

Después puedes borrar del `.env` las tres variables `FOEST_SUPERADMIN_*`. La cuenta queda en Supabase Auth y en `funcionarios_foest`.

## 3. Ingreso
Abre `http://localhost:3000/admin` e inicia con el correo y contraseña del Superadministrador.

## 4. Funcionarios
En **Funcionarios** pulsa **Crear funcionario**, registra nombre, correo, cargo y permisos. El sistema muestra una contraseña temporal una sola vez. Entrégala al funcionario por un canal seguro. El funcionario puede cambiarla desde **Mi cuenta**.

## Permisos disponibles
- Ver dashboard
- Ver postulaciones
- Revisar documentos
- Solicitar subsanaciones
- Aprobar postulaciones
- No aprobar postulaciones
- Ver estudiantes
- Ver reportes
- Exportar Excel

Solo el SUPERADMIN puede gestionar funcionarios. Las cuentas se desactivan, no se borran, para conservar la trazabilidad histórica.
