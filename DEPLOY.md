# Despliegue — droneduca.es · formacion.droneduca.es · admin.droneduca.es

Este proyecto compila como sitio **estático** (`npm run build` → carpeta `dist/`), sin servidor Node. Un mismo
código fuente se reparte en **tres subdominios**:

- **`droneduca.es`** — web corporativa (Inicio, Quiénes somos, Servicios, Precios, Blog, Contacto).
- **`formacion.droneduca.es`** — catálogo de cursos, campus del alumno, login y registro.
- **`admin.droneduca.es`** — panel de administración (sin enlace en ningún menú público).

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

## 2. Crear los subdominios en Sered

En el panel de Sered (normalmente cPanel → Subdominios), crea:

- `formacion` sobre `droneduca.es` → genera `formacion.droneduca.es`. Cuando te pida la carpeta raíz, deja que
  cPanel te proponga la suya propia (algo tipo `formacion.droneduca.es` o `public_html/formacion`), **distinta**
  de `public_html`.
- `admin` sobre `droneduca.es` → genera `admin.droneduca.es`, con su propia carpeta también.

Apunta el nombre de cada carpeta y, si Sered te da credenciales FTP específicas para cada subdominio (cPanel suele
crear cuentas FTP separadas por subdominio, como vimos al principio con la cuenta jaulada), apunta también esas.

## 3. Configurar Supabase

Sigue `SUPABASE.md` para crear el proyecto y ejecutar el SQL. En **Authentication → URL Configuration** (el login
ahora vive en el subdominio de formación, no en el raíz):

- Site URL: `https://formacion.droneduca.es`
- Redirect URLs: `https://formacion.droneduca.es/*` (añade también `http://localhost:4321/*` mientras desarrolles
  en local)

## 4. Configurar las variables de entorno locales

```bash
cp .env.example .env
```

```
PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

Estas claves quedan incrustadas en el build estático — la `anon key` de Supabase está pensada para ser pública, la
seguridad real la dan las políticas RLS ya configuradas en `SUPABASE.md`. En local, `astro dev` siempre se
comporta como el sitio de marketing con enlaces relativos — no hace falta tocar nada para desarrollar, todo se
navega junto en `localhost:4321`.

## 5. Compilar y subir cada subdominio por FTP (manual)

Aquí cada subdominio necesita su **propio build**, porque cada uno tiene una URL base (`site`) distinta:

```bash
# droneduca.es
SITE_URL=https://droneduca.es PUBLIC_SITE_TARGET=marketing npm run build
# → sube el contenido de dist/ a public_html/, EXCEPTO las carpetas cursos/, campus/, login/, registro/, admin/

# formacion.droneduca.es y admin.droneduca.es
SITE_URL=https://formacion.droneduca.es PUBLIC_SITE_TARGET=formacion npm run build
# → sube dist/cursos, dist/campus, dist/login, dist/registro y dist/robots.txt a public_html/formacion/
# → sube el CONTENIDO de dist/admin (no la carpeta en sí) a public_html/admin/
```

Como `formacion.droneduca.es` y `admin.droneduca.es` son subcarpetas del mismo `public_html` (así los creaste en
Sered), usas las mismas credenciales FTP de siempre — solo cambia la carpeta de destino en cada subida.

En ambos casos, cada `npm run build` genera **todas** las páginas igual (Astro no distingue qué vas a subir), la
separación real está en qué carpetas de `dist/` subes a cada sitio.

## 6. Publicación automática desde el admin panel (recomendado, en vez del paso 5 a mano)

Desde que existe `/admin/contenido` (el CMS de los textos de las páginas), lo normal es publicar con el botón
**"Publicar cambios"** del panel en vez de hacerlo a mano. Esto requiere montar una vez lo siguiente (los pasos con
🔒 los ejecutas tú, nunca deben pasar por un chat):

1. **Crear el repositorio en GitHub.** El proyecto ya es un repositorio git local (`git init` ya hecho, con
   commits). 🔒 Crea un repo nuevo (puede ser privado) en [github.com/new](https://github.com/new), sin
   inicializarlo con README, y luego:
   ```bash
   git remote add origin https://github.com/tu-usuario/tu-repo.git
   git branch -M main
   git push -u origin main
   ```
2. 🔒 **Secrets del repositorio** (GitHub → tu repo → Settings → Secrets and variables → Actions → New repository
   secret). El workflow (`.github/workflows/deploy.yml`) espera 5, ya que `formacion.droneduca.es` y
   `admin.droneduca.es` son subcarpetas de `public_html` y comparten las mismas credenciales FTP que
   `droneduca.es`:
   - `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` — los mismos valores que tienes en tu `.env`.
   - `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` — las credenciales FTP que ya usas para subir a `public_html`.
   - `SUPABASE_SERVICE_ROLE_KEY` — desde Supabase Dashboard → Project Settings → API → `service_role` key
     (secreta). Solo la usa el build de `droneduca.es` para generar las páginas de `/galeria/[slug]` (ver
     `SUPABASE.md` §9) — no la pegues nunca en un chat, cópiala directo del Dashboard a GitHub.
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
minutos, los tres dominios muestran la versión nueva. Puedes seguir el progreso en la pestaña **Actions** del
repositorio de GitHub — el primer despliegue conviene vigilarlo por si algún nombre de carpeta o credencial FTP no
coincide exactamente con lo que espera el workflow (revisa `.github/workflows/deploy.yml`).

## Notas

- El contenido de marketing (textos de Inicio, Quiénes somos, Servicios, Precios) se edita desde
  `/admin/contenido` — ver `SUPABASE.md` sección 6.
- El contenido de las lecciones y los exámenes (vídeo, texto, preguntas) se gestiona desde
  `/admin/cursos/<curso>/lecciones` y `/admin/cursos/<curso>/examen` (o directamente en el Table Editor de
  Supabase como alternativa) — ver `SUPABASE.md`.
- `admin.droneduca.es` no aparece enlazado en ningún menú público, y además su `robots.txt` bloquea toda
  indexación — la protección real la da el login + `is_admin`, no la URL.
