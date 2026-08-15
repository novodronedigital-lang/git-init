# Despliegue — droneduca.es

Este proyecto compila como sitio **estático** (`npm run build` → carpeta `dist/`), sin servidor Node. Sustituye por
completo al WordPress que hay ahora mismo en `droneduca.es`: web de marketing + plataforma de formación (`/cursos`,
`/campus`) en un único sitio, en el dominio raíz.

Estos pasos los debe ejecutar quien tenga acceso al panel de Sered y a la cuenta de Supabase — no son acciones que
pueda hacer por ti sin esas credenciales.

## 0. Copia de seguridad del WordPress actual (obligatorio, antes de tocar nada)

**No sigas al paso 1 hasta tener esto hecho y guardado en un sitio seguro** (no solo en este ordenador).

1. **Archivos**: conéctate por FTP a Sered, ve a `public_html` y descarga la carpeta entera a tu ordenador.
2. **Base de datos**: en el panel de Sered (cPanel) abre **phpMyAdmin**, selecciona la base de datos de WordPress
   (el nombre está en `wp-config.php`, variable `DB_NAME`) → pestaña **Exportar** → método "Rápido", formato SQL →
   Exportar. Se descarga un `.sql`.

Con la carpeta de archivos + el `.sql` tienes todo lo necesario para reinstalar el WordPress si algún día hiciera
falta recuperarlo.

## 1. Vaciar el hosting del WordPress actual

Con confirmación de que la copia de seguridad está hecha:

1. Conéctate por FTP a Sered.
2. Entra en `public_html`.
3. Selecciona todo su contenido (`wp-admin`, `wp-content`, `wp-includes`, `wp-config.php`, `.htaccess`, `index.php`,
   etc.) y bórralo.
4. (Opcional, sin prisa) Más adelante, si ya no la necesitas, puedes borrar también la base de datos de WordPress
   desde phpMyAdmin — no es necesario para que la web nueva funcione, así que puedes dejarla como red de seguridad
   el tiempo que quieras.

`public_html` debe quedar vacío antes del siguiente paso.

## 2. Configurar Supabase

Sigue `SUPABASE.md` para crear el proyecto y ejecutar el SQL. En **Authentication → URL Configuration**:

- Site URL: `https://droneduca.es`
- Redirect URLs: `https://droneduca.es/*` (añade también `http://localhost:4321/*` mientras desarrolles en local)

## 3. Configurar las variables de entorno locales

```bash
cp .env.example .env
```

```
PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

Estas claves quedan incrustadas en el build estático — la `anon key` de Supabase está pensada para ser pública, la
seguridad real la dan las políticas RLS ya configuradas en `SUPABASE.md`.

## 4. Compilar

```bash
npm install
npm run build
```

Esto genera la carpeta `dist/` con HTML/CSS/JS listos para subir. `astro.config.mjs` ya está configurado con
`site: "https://droneduca.es"`, así que no hace falta tocar nada de configuración para el dominio raíz.

## 5. Subir por FTP

1. Conéctate por FTP a Sered.
2. Entra en `public_html` (ya vacío tras el paso 1).
3. Sube **todo el contenido de `dist/`** (no la carpeta `dist` en sí, sino lo que hay dentro).
4. Visita `https://droneduca.es` para comprobar que carga la web nueva.

## 6. Cada vez que haya cambios (manual)

Repite los pasos 4 y 5: `npm run build` y volver a subir el contenido de `dist/` por FTP (sobrescribiendo lo
anterior). Esto sigue funcionando siempre como plan B, aunque tengas montada la publicación automática de abajo.

## 7. Publicación automática desde el admin panel (recomendado)

Desde que existe `/admin/contenido` (el CMS de los textos de las páginas), lo normal es publicar con el botón
**"Publicar cambios"** del panel en vez de hacerlo a mano. Esto requiere montar una vez lo siguiente (los pasos con
🔒 los ejecutas tú, nunca deben pasar por un chat):

1. **Crear el repositorio en GitHub.** El proyecto ya es un repositorio git local (`git init` ya hecho, con un
   primer commit). 🔒 Crea un repo nuevo (puede ser privado) en [github.com/new](https://github.com/new), sin
   inicializarlo con README, y luego:
   ```bash
   git remote add origin https://github.com/tu-usuario/tu-repo.git
   git branch -M main
   git push -u origin main
   ```
2. 🔒 **Secrets del repositorio** (GitHub → tu repo → Settings → Secrets and variables → Actions → New repository
   secret). Añade estos 5:
   - `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY` — los mismos valores que tienes en tu `.env`.
   - `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` — las credenciales FTP de Sered (las mismas que usas en
     FileZilla).
3. 🔒 **Token de GitHub para la Edge Function**: en GitHub → tu avatar → Settings → Developer settings →
   Personal access tokens → Fine-grained tokens → Generate new token. Dale acceso **solo a este repositorio**, con
   permiso de **Contents: Read-only** y **Actions: Read and write**. Cópialo (solo se ve una vez).
4. 🔒 En tu terminal, con el [CLI de Supabase](https://supabase.com/docs/guides/cli) instalado y logueado
   (`supabase login`), vincula el proyecto y guarda el token como secreto de la función (así no pasa por ningún
   chat):
   ```bash
   supabase link --project-ref ootjvwuucwysllzmdreo
   supabase secrets set GH_TOKEN=el_token_que_acabas_de_copiar GH_REPO=tu-usuario/tu-repo
   supabase functions deploy publish
   ```
5. Comprueba que `SUPABASE.md` sección 6 tiene la tabla `site_content` creada en tu proyecto real (si aún no la
   has ejecutado, hazlo ahora).

A partir de aquí: guardas cambios en `/admin/contenido` → pulsas **"Publicar cambios"** en `/admin` → en 1-2
minutos, `https://droneduca.es` muestra la versión nueva. Puedes seguir el progreso en la pestaña **Actions** del
repositorio de GitHub.

## Notas

- El contenido de marketing (textos de Inicio, Quiénes somos, Servicios, Precios) se edita desde
  `/admin/contenido` — ver `SUPABASE.md` sección 6.
- El contenido de las lecciones y los exámenes (vídeo, texto, preguntas) se gestiona desde
  `/admin/cursos/<curso>/lecciones` y `/admin/cursos/<curso>/examen` (o directamente en el Table Editor de
  Supabase como alternativa) — ver `SUPABASE.md`.
- El panel de admin no tiene por qué anunciarse en el menú público — si quieres que viva en un subdominio propio
  (por ejemplo `admin.droneduca.es`), en Sered crea ese subdominio apuntando a la misma carpeta `public_html` (es
  el mismo build; la protección real la da el login + `is_admin`, no la URL).
