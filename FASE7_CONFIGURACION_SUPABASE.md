# Fase 7.1 — Supabase Auth mediante enlaces

## 1. Base de datos
Ejecuta `sql/005_fase7_supabase_auth.sql` si todavía no lo hiciste.

## 2. Variables
Conserva `SUPABASE_SERVICE_KEY` y agrega `SUPABASE_ANON_KEY` (puede ser la Publishable key).

## 3. Confirmación por enlace
En Authentication > Providers > Email activa la confirmación de correo.

En Authentication > Email Templates > Confirm signup, usa `{{ .ConfirmationURL }}`.
Ejemplo:
`<p>Confirma tu cuenta FOEST haciendo clic en el siguiente enlace:</p><p><a href="{{ .ConfirmationURL }}">Confirmar correo</a></p>`

En Reset password:
`<p>Para crear una nueva contraseña haz clic aquí:</p><p><a href="{{ .ConfirmationURL }}">Restablecer contraseña</a></p>`

## 4. URL Configuration
En Authentication > URL Configuration agrega como Redirect URL durante desarrollo:
`http://localhost:3000/**`

El sistema solicita:
- Confirmación: `http://localhost:3000/estudiante/login.html?confirmado=1`
- Recuperación: `http://localhost:3000/estudiante/restablecer.html`

En producción sustituye localhost por el dominio real y añádelo a la lista permitida.

## 5. Prueba
1. `npm start`
2. Crea una cuenta nueva.
3. Abre el correo y pulsa Confirmar correo.
4. Debes volver al login y poder iniciar sesión.
5. Prueba Olvidé mi contraseña.
6. Abre el enlace recibido, define la contraseña nueva e inicia sesión.

Nota: cambiar OTP por enlace no cambia el mecanismo de entrega de email. Para destinatarios reales, el proyecto puede requerir SMTP personalizado según la configuración/límites de Supabase.
