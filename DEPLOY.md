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

## 6. Cada vez que haya cambios

Repite los pasos 4 y 5: `npm run build` y volver a subir el contenido de `dist/` por FTP (sobrescribiendo lo
anterior).

## Notas

- El contenido de marketing actual (teléfono, textos, imágenes) incluye datos de ejemplo — se decidió publicar así
  y pulirlo después, no antes del lanzamiento.
- El contenido de las lecciones y los exámenes (vídeo, texto, preguntas) se gestiona directamente en el
  **Table Editor** de Supabase, no requiere volver a compilar ni subir nada — ver `SUPABASE.md`.
