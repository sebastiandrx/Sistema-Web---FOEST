# FOEST — Fase 9: despliegue de pruebas en Render

## 1. Antes de subir a GitHub
El proyecto incluye un archivo `.env` para trabajar localmente. Completa allí tus claves reales si aún no lo has hecho.

**Importante:** `.env` está incluido en `.gitignore`. No fuerces su subida a GitHub y nunca publiques `SUPABASE_SERVICE_KEY`.

## 2. Probar localmente
```powershell
npm install
npm start
```
Abre `http://localhost:3000`.

## 3. Crear repositorio en GitHub
Crea un repositorio (preferiblemente privado para esta prueba) y sube el proyecto. Comprueba en GitHub que `.env` NO aparezca.

## 4. Crear el Web Service en Render
En Render:
1. New > Web Service.
2. Conecta GitHub y selecciona el repositorio FOEST.
3. Runtime: Node.
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Plan: Free.
7. Crea el servicio.

El servidor usa `process.env.PORT` y escucha en `0.0.0.0`, como requiere Render.

## 5. Variables de entorno en Render
En Environment agrega los valores reales:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_ANON_KEY`
- `SUPABASE_STORAGE_BUCKET`

También puedes usar la opción **Add from .env** de Render y pegar allí el contenido de tu `.env`. Estas variables se guardan en Render, no en GitHub.

## 6. Configurar Supabase Auth
Cuando Render entregue una URL, por ejemplo:
`https://foest-tocancipa.onrender.com`

En Supabase > Authentication > URL Configuration:
- Site URL: usa la URL pública de Render para las pruebas web.
- Redirect URLs: agrega las rutas de autenticación que usa FOEST bajo el dominio de Render. Puedes mantener `http://localhost:3000/**` para seguir probando localmente.

Si usas una regla amplia durante pruebas, `https://TU-SERVICIO.onrender.com/**` cubre las rutas internas. Para producción conviene usar URLs exactas.

## 7. Comprobación final
Prueba:
- página principal;
- registro/login de estudiante;
- confirmación y recuperación por correo;
- postulación y documentos;
- `/admin`;
- Superadministrador;
- creación/login de funcionarios;
- permisos;
- revisión/subsanación;
- exportación Excel.

## Nota del plan gratuito
Render puede suspender temporalmente el Web Service gratuito cuando está inactivo. La primera visita posterior puede tardar más mientras vuelve a iniciar.
