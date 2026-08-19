# Supabase — esquema de la plataforma de formación

Este proyecto usa [Supabase](https://supabase.com) como backend (autenticación + base de datos) para la parte
privada del campus (`/campus/*`). El catálogo de cursos (título, descripción, temario) es público y vive en
`src/content/courses/*.md`; el contenido real de las lecciones (vídeo, texto) y los exámenes viven en Supabase,
protegidos con Row Level Security (RLS) para que solo los usuarios autenticados puedan leerlos.

## 1. Crear el proyecto

1. Crea una cuenta y un proyecto nuevo en [supabase.com](https://supabase.com) (el plan gratuito es suficiente para
   empezar).
2. En **Project Settings → API**, copia la **Project URL** y la **anon public key**. Van en tu `.env` local como
   `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY` (ver `.env.example`).
3. En **Authentication → URL Configuration**, configura:
   - **Site URL**: `https://formacion.droneduca.es` (el login y el registro viven en el subdominio de
     formación, no en el dominio raíz — ver `DEPLOY.md`)
   - **Redirect URLs**: `https://formacion.droneduca.es/*` (añade también `http://localhost:4321/*` mientras
     desarrollas en local).

## 2. Ejecutar el esquema SQL

Ve a **SQL Editor** en el panel de Supabase y ejecuta lo siguiente:

```sql
-- ==========================================================
-- profiles: perfil público de cada usuario
-- ==========================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Los usuarios ven su propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Los usuarios actualizan su propio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Autocompleta el perfil cuando alguien se registra
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================================
-- lessons: contenido privado de cada lección
-- El orden (course_slug, lesson_order) debe coincidir con el
-- temario aplanado de src/content/courses/<slug>.md
-- ==========================================================
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_slug text not null,
  module_order int not null,
  lesson_order int not null,
  title text not null,
  video_url text,
  body text,
  created_at timestamptz not null default now(),
  unique (course_slug, lesson_order)
);

create index lessons_course_slug_idx on public.lessons (course_slug);

alter table public.lessons enable row level security;

create policy "Los usuarios autenticados leen las lecciones"
  on public.lessons for select
  to authenticated
  using (true);

-- ==========================================================
-- lesson_progress: qué lecciones ha completado cada usuario
-- ==========================================================
create table public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table public.lesson_progress enable row level security;

create policy "Los usuarios gestionan su propio progreso"
  on public.lesson_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ==========================================================
-- quizzes: un examen final por curso
-- questions es un array jsonb:
-- [{ "question": "...", "options": ["A","B","C"], "correctIndex": 0 }, ...]
-- ==========================================================
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  course_slug text not null unique,
  title text not null,
  questions jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.quizzes enable row level security;

create policy "Los usuarios autenticados leen los exámenes"
  on public.quizzes for select
  to authenticated
  using (true);

-- ==========================================================
-- quiz_attempts: intentos de examen de cada usuario
-- ==========================================================
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  score numeric not null,
  total numeric not null,
  answers jsonb,
  submitted_at timestamptz not null default now()
);

alter table public.quiz_attempts enable row level security;

create policy "Los usuarios gestionan sus propios intentos"
  on public.quiz_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## 3. Cargar el contenido de las lecciones y los exámenes

El equipo de Droneduca añade el contenido real (vídeo, texto, preguntas) directamente desde **Table Editor** en
Supabase, no desde el código:

- **`lessons`**: una fila por lección. `course_slug` debe coincidir con el nombre de archivo del curso en
  `src/content/courses/` (sin `.md`). `lesson_order` es la posición de la lección al aplanar todos los módulos del
  curso en orden (1, 2, 3...). `video_url` debe ser una URL de embed de YouTube (`https://www.youtube.com/embed/ID`)
  o Vimeo (`https://player.vimeo.com/video/ID`) — el vídeo puede estar "no listado", pero debe ser una de estas dos
  plataformas, ya que el reproductor solo carga vídeos de esos dominios por seguridad.
- **`quizzes`**: una fila por curso (`course_slug` único), con las preguntas en `questions`.

## 4. Nota sobre la corrección de exámenes

Para este MVP, el examen se corrige en el navegador del alumno (se compara su respuesta con `correctIndex`). Un
usuario muy avanzado podría, en teoría, inspeccionar la respuesta correcta a través de las herramientas de
desarrollador antes de contestar. Dado que estos cursos son formativos y no una certificación oficial, es un riesgo
aceptado para el MVP. Si en el futuro hace falta blindarlo del todo, se puede mover la corrección a una Supabase Edge
Function (la pregunta se serviría sin `correctIndex`, y la function compararía las respuestas en el servidor) sin
tener que rehacer el resto de la plataforma.

## 5. Ampliación — accesos por curso, admin panel, foro y calendario

A partir de aquí, el acceso a cada curso ya no es "cualquier autenticado": el curso gratuito (`drone-starter`) sigue
siendo abierto para cualquiera con cuenta, pero los cursos de pago (`piloto-a1-a3`, `novodrone-pilot`) requieren que
un admin conceda el acceso desde `/admin/alumnos`. También se añade un editor de contenido, un foro y un calendario
de clases en directo (estos dos últimos solo para los cursos con `forum`/`calendar` activados en su frontmatter,
hoy en día solo `novodrone-pilot`).

Ejecuta este SQL adicional en el **SQL Editor** de Supabase (después del bloque de la sección 2):

```sql
-- ==========================================================
-- profiles: añadir email e is_admin
-- ==========================================================
alter table public.profiles add column email text;
alter table public.profiles add column is_admin boolean not null default false;

-- El trigger de registro también guarda el email
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$;

-- ==========================================================
-- is_admin(): función auxiliar para las políticas RLS
-- (evita la recursión de consultar `profiles` dentro de su
-- propia policy)
-- ==========================================================
create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Los admins pueden ver todos los perfiles (además de el suyo propio)
create policy "Los admins ven todos los perfiles"
  on public.profiles for select
  using (public.is_admin());

-- ==========================================================
-- enrollments: a qué cursos de pago tiene acceso cada alumno
-- ==========================================================
create table public.enrollments (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_slug text not null,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id),
  primary key (user_id, course_slug)
);

alter table public.enrollments enable row level security;

create policy "Ver las propias inscripciones o admin"
  on public.enrollments for select
  using (user_id = auth.uid() or public.is_admin());

create policy "Solo un admin gestiona inscripciones"
  on public.enrollments for insert
  with check (public.is_admin());

create policy "Solo un admin borra inscripciones"
  on public.enrollments for delete
  using (public.is_admin());

-- ==========================================================
-- lessons / quizzes: sustituir "cualquier autenticado" por
-- "curso gratuito, inscrito, o admin"; añadir escritura admin
-- ==========================================================
drop policy "Los usuarios autenticados leen las lecciones" on public.lessons;

create policy "Leer lecciones por curso gratuito, inscripción o admin"
  on public.lessons for select
  using (
    course_slug = 'drone-starter'
    or exists (select 1 from public.enrollments e where e.user_id = auth.uid() and e.course_slug = lessons.course_slug)
    or public.is_admin()
  );

create policy "Los admins gestionan las lecciones"
  on public.lessons for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy "Los usuarios autenticados leen los exámenes" on public.quizzes;

create policy "Leer examen por curso gratuito, inscripción o admin"
  on public.quizzes for select
  using (
    course_slug = 'drone-starter'
    or exists (select 1 from public.enrollments e where e.user_id = auth.uid() and e.course_slug = quizzes.course_slug)
    or public.is_admin()
  );

create policy "Los admins gestionan los exámenes"
  on public.quizzes for all
  using (public.is_admin())
  with check (public.is_admin());

-- ==========================================================
-- forum_authors: vista de solo id + nombre, para poder mostrar
-- el autor de cada post/respuesta sin exponer el email de nadie
-- (profiles solo deja ver el propio perfil o, si eres admin, todos)
-- ==========================================================
create view public.forum_authors
with (security_invoker = false) as
  select id, full_name from public.profiles;

grant select on public.forum_authors to authenticated;

-- ==========================================================
-- forum_posts / forum_replies: foro por curso (solo lectura y
-- escritura para inscritos en ese curso, o admin)
-- ==========================================================
create table public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  course_slug text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.forum_posts enable row level security;

create policy "Leer el foro por inscripción o admin"
  on public.forum_posts for select
  using (
    exists (select 1 from public.enrollments e where e.user_id = auth.uid() and e.course_slug = forum_posts.course_slug)
    or public.is_admin()
  );

create policy "Escribir en el foro por inscripción o admin"
  on public.forum_posts for insert
  with check (
    user_id = auth.uid()
    and (
      exists (select 1 from public.enrollments e where e.user_id = auth.uid() and e.course_slug = forum_posts.course_slug)
      or public.is_admin()
    )
  );

create table public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.forum_replies enable row level security;

create policy "Leer respuestas por inscripción o admin"
  on public.forum_replies for select
  using (
    exists (
      select 1 from public.forum_posts fp
      join public.enrollments e on e.course_slug = fp.course_slug and e.user_id = auth.uid()
      where fp.id = forum_replies.post_id
    )
    or public.is_admin()
  );

create policy "Responder por inscripción o admin"
  on public.forum_replies for insert
  with check (
    user_id = auth.uid()
    and (
      exists (
        select 1 from public.forum_posts fp
        join public.enrollments e on e.course_slug = fp.course_slug and e.user_id = auth.uid()
        where fp.id = forum_replies.post_id
      )
      or public.is_admin()
    )
  );

-- ==========================================================
-- live_sessions: calendario de clases en directo por curso
-- ==========================================================
create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  course_slug text not null,
  title text not null,
  starts_at timestamptz not null,
  join_url text,
  created_at timestamptz not null default now()
);

create index live_sessions_course_slug_idx on public.live_sessions (course_slug);

alter table public.live_sessions enable row level security;

create policy "Leer el calendario por inscripción o admin"
  on public.live_sessions for select
  using (
    exists (select 1 from public.enrollments e where e.user_id = auth.uid() and e.course_slug = live_sessions.course_slug)
    or public.is_admin()
  );

create policy "Los admins gestionan el calendario"
  on public.live_sessions for all
  using (public.is_admin())
  with check (public.is_admin());
```

### Bootstrap: convertir a los 5 en admins

Cada persona del equipo debe **registrarse primero** en la web (`/registro`) con su email real. Una vez registrados
los 5, ejecuta esto una sola vez en el SQL Editor (cambia los emails por los reales):

```sql
update public.profiles
set is_admin = true
where email in (
  'jorge@droneduca.com',
  'miguel@droneduca.com',
  'lucas@droneduca.com',
  'iker@droneduca.com',
  'javi@droneduca.com'
);
```

A partir de ahí, cualquiera de los 5 que inicie sesión en `/login` verá el enlace al admin panel en `/admin`.

### Cómo se gestiona ahora el contenido

- **Accesos a cursos de pago**: desde `/admin/alumnos`, no hace falta tocar Supabase directamente.
- **Lecciones y examen**: desde `/admin/cursos/<curso>/lecciones` y `/admin/cursos/<curso>/examen`. El Table Editor
  de Supabase sigue funcionando igual como alternativa manual si hace falta.
- **Calendario de clases en directo** (solo `novodrone-pilot` por ahora): desde
  `/admin/cursos/novodrone-pilot/calendario`.

## 6. Contenido de las páginas públicas (CMS) y publicación automática

Los textos de negocio de Inicio, Quiénes somos, las 3 páginas de Servicios y Precios ya no están escritos a mano en
el código: viven en una tabla `site_content` en Supabase, editable desde `/admin/contenido`. Cada página los lee en
el momento del **build** (no en el navegador del visitante), así que sigue siendo una web estática normal — un
cambio guardado en el panel no se ve en real hasta que se publica (ver más abajo).

El blog y los datos de contacto (`site.ts`) quedan fuera de este CMS por ahora.

Ejecuta este SQL adicional en el SQL Editor de Supabase:

```sql
-- ==========================================================
-- site_content: contenido editable de las páginas públicas
-- ==========================================================
create table public.site_content (
  key text primary key,
  content jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.site_content enable row level security;

create policy "Cualquiera puede leer el contenido (lo usa el build)"
  on public.site_content for select
  using (true);

create policy "Solo un admin edita el contenido"
  on public.site_content for all
  using (public.is_admin())
  with check (public.is_admin());

-- Contenido inicial: el mismo texto que ya había en el código,
-- para que el primer build no cambie nada.
insert into public.site_content (key, content) values
('home.hero', '{
  "badge": "Zaragoza y toda España",
  "title": "Actividades con drones para niños",
  "description": "El primer proyecto educativo centrado en el mundo de los drones. Nuestros jóvenes pilotos aprenden de un sector con un futuro brillante a través de extraescolares, jornadas, eventos y cursos.",
  "stats": [
    { "value": "8 años", "label": "Edad ideal para empezar" },
    { "value": "13 años", "label": "Edad de nuestro mejor piloto campeón" },
    { "value": "100%", "label": "Sesiones con vuelo real" }
  ]
}'),
('home.services', '{
  "items": [
    { "icon": "users", "title": "Actividades extraescolares", "description": "Clases extraescolares de drones en colegios donde los jóvenes pilotos aprenden a volar con seguridad, formación de calidad y muchas horas de diversión.", "href": "/servicios/actividades-extraescolares" },
    { "icon": "calendar", "title": "Jornadas y eventos", "description": "Jornadas de formación y eventos con drones para colegios, casas de juventud, escuelas de tiempo libre y polideportivos, donde los protagonistas son ellos.", "href": "/servicios/jornadas-eventos" },
    { "icon": "trophy", "title": "Cursos y talleres", "description": "Talleres intensivos y cursos de introducción al pilotaje, pensados para grupos que quieren aprender rápido y con seguridad en pocas sesiones.", "href": "/servicios/cursos-talleres" }
  ]
}'),
('home.benefits', '{
  "items": [
    { "icon": "shield", "title": "Seguridad ante todo", "description": "Protocolos claros, espacios controlados y material adaptado a cada edad para volar sin sobresaltos." },
    { "icon": "spark", "title": "Formación de calidad", "description": "Monitores especializados y una progresión pensada para que cada piloto avance a su ritmo." },
    { "icon": "compass", "title": "Aprendizaje STEM", "description": "Física, tecnología y trabajo en equipo, aprendidos jugando y volando drones de verdad." },
    { "icon": "book", "title": "Diversión garantizada", "description": "El objetivo es que disfruten aprendiendo: por eso el 100% de las sesiones incluyen vuelo real." }
  ]
}'),
('home.skills', '{
  "title": "Los drones han llegado para quedarse",
  "description": "Su versatilidad los está convirtiendo en herramientas clave en fotografía, cine, deporte, seguridad y salvamento, agricultura, inspecciones industriales o transporte. Volar drones desde pequeños desarrolla habilidades que les acompañarán toda la vida.",
  "items": ["Concentración y paciencia", "Coordinación y motricidad fina", "Pensamiento espacial", "Trabajo en equipo", "Resolución de problemas", "Responsabilidad y autocontrol"],
  "highlightTitle": "¿Sabías que nuestro mejor piloto, campeón, tiene solo 13 años?",
  "highlightText": "Desde los 8 años es la edad ideal para empezar a volar drones, por los múltiples beneficios que aporta a su desarrollo. Cuanto antes empiezan, más disfrutan del camino."
}'),
('home.zaragoza', '{
  "zaragozaTitle": "¡Estamos en Zaragoza!",
  "zaragozaText": "Realizamos actividades de forma habitual en Zaragoza y alrededores, en colegios, ayuntamientos y entidades juveniles.",
  "outsideTitle": "¿Fuera de Aragón?",
  "outsideText": "También nos desplazamos fuera de Aragón para organizar tu actividad o taller, sin necesidad de un número mínimo de participantes. El precio será algo más elevado para cubrir el desplazamiento."
}'),
('quienes-somos.hero', '{
  "title": "Un proyecto educativo con los pies en la tierra y la mirada en el cielo",
  "description": "En DronEduca creemos que los drones son mucho más que tecnología: son una herramienta extraordinaria para que niños y jóvenes aprendan, se concentren y se diviertan mientras desarrollan habilidades que les acompañarán toda la vida.",
  "stats": [
    { "value": "8", "label": "Años, edad ideal de inicio" },
    { "value": "100%", "label": "Sesiones con vuelo real" }
  ],
  "bannerTitle": "Zaragoza y desplazamientos a toda España",
  "bannerText": "Sin mínimo de participantes fuera de Aragón"
}'),
('quienes-somos.milestones', '{
  "items": [
    { "title": "El origen", "description": "DronEduca nace como el primer proyecto educativo centrado en el mundo de los drones, con el objetivo de acercar este sector con tanto futuro a niños y jóvenes." },
    { "title": "La metodología", "description": "Nuestra metodología es única en el sector: nada de teoría en diapositivas y poco más. Se aprende volando desde la primera sesión, con la teoría siempre aplicada directamente a la práctica de vuelo real." },
    { "title": "El presente", "description": "Hoy trabajamos con colegios, ayuntamientos, casas de juventud y escuelas de tiempo libre en Zaragoza, y nos desplazamos a otras localidades bajo petición." }
  ]
}'),
('quienes-somos.values', '{
  "items": [
    { "icon": "shield", "title": "Seguridad", "description": "Cada vuelo se realiza en espacios controlados, con protocolos claros y material adaptado a la edad de cada piloto." },
    { "icon": "spark", "title": "Formación de calidad", "description": "Contenidos pensados por monitores especializados en drones y educación, con una progresión clara por niveles." },
    { "icon": "compass", "title": "Aprendizaje activo", "description": "Se aprende volando: la teoría siempre acompaña a la práctica real con drones desde la primera sesión." },
    { "icon": "users", "title": "Cercanía", "description": "Grupos reducidos para que cada joven piloto reciba la atención que necesita y avance a su propio ritmo." }
  ]
}'),
('quienes-somos.team', '{
  "title": "Empezamos como alumnos, hoy somos el equipo",
  "description": "En DronEduca no vas a encontrar monitores contratados de fuera: nuestro equipo son chavales de 18 y 19 años que fueron alumnos de la propia academia desde que tenían 10 años. Conocen la metodología porque la han vivido, y eso se nota en cada sesión.",
  "items": [
    { "name": "Jorge y Miguel", "role": "Fundadores y CEOs de DronEduca y Novodrone" },
    { "name": "Lucas", "role": "19 años · Coordinador de DronEduca" },
    { "name": "Iker", "role": "18 años · Director de Operaciones" },
    { "name": "Javi", "role": "Monitor especializado en educación infantil" }
  ]
}'),
('servicios.actividades-extraescolares', '{
  "hero": {
    "title": "Actividades extraescolares con drones",
    "description": "Nuestra actividad principal: clases extraescolares de drones en colegios, donde los jóvenes pilotos aprenden a volar con seguridad a través de formación de calidad y muchas horas de diversión, semana a semana durante todo el curso.",
    "note": "La solicitud debe partir del AMPA o del equipo directivo del centro. Escríbenos y nos ponemos en contacto directamente con el colegio para organizarlo todo."
  },
  "levels": [
    { "title": "Nivel 1 · Despegue", "description": "Seguridad, normativa básica y primeros vuelos guiados con drones de iniciación." },
    { "title": "Nivel 2 · Control", "description": "Maniobras de precisión, circuitos sencillos y primeras nociones de mantenimiento del equipo." },
    { "title": "Nivel 3 · Piloto avanzado", "description": "Vuelo en formación, introducción al FPV y primeros retos de velocidad y precisión." }
  ],
  "included": ["Drones y material homologado para cada nivel", "Monitor especializado en cada sesión", "Seguro de responsabilidad civil de la actividad", "Informe de progreso por trimestre", "Espacio interior o exterior según el colegio"]
}'),
('servicios.jornadas-eventos', '{
  "hero": {
    "title": "Jornadas y eventos con drones",
    "description": "Realizamos todo tipo de jornadas de formación y eventos con drones para jóvenes en colegios, casas de juventud, escuelas de tiempo libre y polideportivos, donde ellos son los verdaderos protagonistas.",
    "bannerTitle": "¡Estamos en Zaragoza!",
    "bannerText": "También organizamos actividades y talleres fuera de Aragón, sin necesidad de un número mínimo de participantes. El precio será algo más elevado para cubrir el desplazamiento."
  },
  "formats": [
    { "icon": "calendar", "title": "Jornada de medio día", "description": "Introducción teórica y prácticas de vuelo guiadas, ideal para grupos de un único colegio o entidad." },
    { "icon": "trophy", "title": "Jornada de día completo", "description": "Formato ampliado con circuitos, retos por equipos y una pequeña exhibición final de vuelo." },
    { "icon": "users", "title": "Evento multitudinario", "description": "Para ferias, semanas culturales o fiestas patronales: varios puestos de vuelo simultáneos." }
  ],
  "audiences": ["Colegios", "Ayuntamientos", "Casas de juventud", "Escuelas de tiempo libre", "Polideportivos"]
}'),
('servicios.cursos-talleres', '{
  "hero": {
    "title": "Cursos y talleres de drones",
    "description": "Talleres intensivos pensados para grupos que quieren aprender rápido y con seguridad en pocas sesiones: campamentos de verano, semanas blancas o actividades puntuales de vacaciones. Nos adaptamos por completo a las necesidades de cada grupo, ya sea un taller intensivo de una semana, una sesión puntual de un solo día o un pack a medida.",
    "noteTitle": "* Cursos de carácter extraoficial",
    "noteText": "Estos cursos no otorgan un título o licencia oficial de piloto de drones ni capacitan para realizar trabajos profesionales con drones. Su objetivo es formativo y recreativo."
  },
  "intro": "Estos son formatos de ejemplo — el número de sesiones y el contenido se ajustan siempre a lo que necesite tu grupo.",
  "courses": [
    { "icon": "compass", "title": "Iniciación al pilotaje", "duration": "4 sesiones", "description": "Primeros vuelos con seguridad, control básico y nociones de normativa para pilotos que empiezan de cero." },
    { "icon": "trophy", "title": "Taller de precisión", "duration": "3 sesiones", "description": "Circuitos, aterrizajes de precisión y pequeños retos por equipos para pilotos con nociones básicas." },
    { "icon": "spark", "title": "Introducción al FPV", "duration": "2 sesiones", "description": "Primer contacto con el vuelo en primera persona y las carreras de drones, para los más atrevidos." }
  ]
}'),
('precios.plans', '{
  "items": [
    { "name": "Actividad extraescolar", "price": "15-20€", "unit": "/ alumno / mes", "description": "Sesión semanal durante el curso escolar, en el propio colegio. El precio final depende del número de alumnos apuntados.", "href": "/servicios/actividades-extraescolares", "featured": false, "bullets": ["1 sesión semanal de 1 hora", "Grupos de hasta 12 pilotos", "Material y monitor incluidos", "Informe de progreso trimestral"] },
    { "name": "Jornada o evento", "price": "Desde 250€", "unit": "/ jornada", "description": "Formato puntual de medio día o día completo, dentro o fuera de Zaragoza.", "href": "/servicios/jornadas-eventos", "featured": true, "bullets": ["Medio día o día completo", "Hasta 30 participantes por jornada", "Desplazamiento incluido en Aragón", "Fuera de Aragón, sin mínimo de participantes"] },
    { "name": "Curso o taller intensivo", "price": "Desde 90€", "unit": "/ piloto", "description": "Entre 2 y 4 sesiones intensivas, ideal para campamentos y vacaciones.", "href": "/servicios/cursos-talleres", "featured": false, "bullets": ["De 2 a 4 sesiones intensivas", "Grupos reducidos por nivel", "Material incluido", "Diploma acreditativo de participación"] }
  ]
}'),
('precios.faqs', '{
  "items": [
    { "q": "¿Los precios incluyen el material?", "a": "Sí, en todos los formatos incluimos los drones y el material necesario para volar con seguridad. El centro o entidad solo necesita ceder el espacio." },
    { "q": "¿Qué pasa si queremos la actividad fuera de Aragón?", "a": "Nos desplazamos a cualquier localidad de España sin necesidad de un número mínimo de participantes. El coste del desplazamiento se calcula según la distancia y se suma al presupuesto." },
    { "q": "¿Hay descuentos para grupos grandes?", "a": "Sí, a partir de ciertos volúmenes de alumnos o participantes aplicamos tarifas reducidas. Cuéntanos tu caso y te preparamos un presupuesto ajustado." },
    { "q": "¿Estos cursos otorgan alguna licencia oficial?", "a": "No. Todas nuestras actividades son de carácter extraescolar y recreativo, y no otorgan título ni licencia oficial de piloto de drones." }
  ]
}');
```

### Publicación automática con GitHub Actions

Como la web es estática, guardar un cambio en `/admin/contenido` lo actualiza al instante en Supabase, pero **no**
en la web pública — hace falta reconstruir (`build`) y volver a subir. Para no tener que hacerlo a mano cada vez,
se monta esto una sola vez:

1. **Repositorio en GitHub**: crea un repo (puede ser privado) y sube este proyecto.
2. **Secrets del repo** (GitHub → Settings → Secrets and variables → Actions): añade `PUBLIC_SUPABASE_URL`,
   `PUBLIC_SUPABASE_ANON_KEY`, `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` (las credenciales FTP de Sered).
3. **Token de GitHub para la Edge Function**: en GitHub, crea un **Personal Access Token** de solo lectura de
   `Contents` y escritura de `Actions` sobre este repo (Settings → Developer settings → Fine-grained tokens).
4. En tu terminal (no en este chat, para que el token no quede guardado en la conversación), con el
   [CLI de Supabase](https://supabase.com/docs/guides/cli) ya vinculado a tu proyecto:
   ```bash
   supabase secrets set GH_TOKEN=tu_token_de_github GH_REPO=tu-usuario/tu-repo
   ```
5. Despliega la función: `supabase functions deploy publish`.

A partir de ahí, el botón **"Publicar cambios"** de `/admin` dispara el build + subida por FTP automáticamente, sin
que haga falta hacerlo a mano. El flujo manual (`npm run build` + subir `dist/` por FTP) documentado en `DEPLOY.md`
sigue funcionando igual como alternativa.

## 7. Ampliación — teléfono en el registro

`/registro` ahora pide también un teléfono. Ejecuta esto en el **SQL Editor** de Supabase para guardarlo:

```sql
-- ==========================================================
-- profiles: añadir phone
-- ==========================================================
alter table public.profiles add column phone text;

-- El trigger de registro también guarda el teléfono
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email, new.raw_user_meta_data->>'phone');
  return new;
end;
$$;
```

Esto solo afecta a quien se registre a partir de ahora — a los alumnos ya registrados les quedará `phone` en blanco
hasta que lo actualicen o se lo pidas tú a mano.

## 8. Ampliación — mensajes del formulario de contacto

Hasta ahora `/contacto` no guardaba nada en ningún sitio (era un formulario sin conectar). Ejecuta esto en el
**SQL Editor** para que los mensajes se guarden y solo el equipo pueda leerlos:

```sql
-- ==========================================================
-- contact_messages: solicitudes del formulario de /contacto
-- ==========================================================
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text,
  entity text,
  activity text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'archived'))
);

alter table public.contact_messages enable row level security;

-- Cualquiera puede enviar el formulario, incluso sin haber iniciado sesión.
create policy "Cualquiera puede enviar un mensaje de contacto"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

-- Solo el equipo (admins) puede leerlos, marcarlos como leídos o archivarlos.
create policy "Los admins ven los mensajes de contacto"
  on public.contact_messages for select
  using (public.is_admin());

create policy "Los admins actualizan los mensajes de contacto"
  on public.contact_messages for update
  using (public.is_admin());
```

### Aviso por email a hola@droneduca.com (opcional, con Resend)

Además de guardarse en la tabla (y verse en `/admin/mensajes`), puedes recibir un aviso por email cada vez que
llega un mensaje nuevo, **y también cada vez que alguien crea una cuenta en `/registro`**. Esto usa
[Resend](https://resend.com) (100 emails/día gratis) a través de dos Edge Functions, `notify-contact` y
`notify-signup` — mismo mecanismo, misma API key de Resend, cada una avisando de un evento distinto.

1. Crea una cuenta gratuita en [resend.com](https://resend.com). Al registrarte con `hola@droneduca.com`, ya
   puedes enviarte emails de prueba a esa misma dirección sin verificar ningún dominio — para enviar desde una
   dirección propia (por ejemplo `notificaciones@droneduca.es`) tendrás que verificar el dominio más adelante
   desde **Domains** en el panel de Resend (añade unos registros DNS en Sered).
2. En Resend, ve a **API Keys** → **Create API Key** y cópiala.
3. En tu terminal (nunca la pegues en un chat), con el proyecto ya vinculado:
   ```bash
   supabase secrets set RESEND_API_KEY=tu_api_key_de_resend
   ```
4. Despliega las dos funciones (sin verificación de JWT, igual que `publish`, porque las llaman formularios
   públicos sin sesión garantizada):
   ```bash
   supabase functions deploy notify-contact --no-verify-jwt
   supabase functions deploy notify-signup --no-verify-jwt
   ```

A partir de ahí, cada envío del formulario de `/contacto` y cada alta nueva en `/registro` disparan un email a
hola@droneduca.com si `RESEND_API_KEY` está configurada. Si no la configuras, todo sigue funcionando igual —
simplemente no llega el aviso por correo (los mensajes de contacto se siguen viendo en `/admin/mensajes`, y las
cuentas nuevas en `/admin/alumnos`).

Por defecto el aviso llega a `hola@droneduca.com` desde `DronEduca <onboarding@resend.dev>` — puedes cambiar
cualquiera de los dos con `supabase secrets set NOTIFY_EMAIL=... NOTIFY_FROM="DronEduca <web@droneduca.es>"` (el
`NOTIFY_FROM` con un dominio propio como `droneduca.es` solo funciona una vez verificado ese dominio en Resend,
paso 1 de arriba).

## 9. Ampliación — galería de fotos y vídeo por taller

Cada taller o jornada puede tener su propia galería privada: se sube desde `/admin/galeria`, y se comparte con las
familias o el colegio mandándoles el enlace público (`droneduca.es/galeria/<slug>`) — sin necesidad de cuenta ni
contraseña. La privacidad la da que el slug es largo y no adivinable, no un login.

A diferencia del resto de tablas, `galleries`/`gallery_items` **no tienen ninguna policy de lectura pública**: la
página pública se genera en build time con la **service-role key** (bypassa RLS), así que la anon key del navegador
nunca puede listarlas. Ver `src/lib/supabaseAdmin.ts` y `DEPLOY.md` para el secret `SUPABASE_SERVICE_ROLE_KEY` que
hace falta en GitHub Actions.

Esta migración vive en `supabase/migrations/20260819120000_gallery.sql` (primera vez que este proyecto usa
migraciones de verdad en vez de pegar el SQL a mano — aplícala con `supabase db push`):

```sql
create table public.galleries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  event_date date not null default current_date,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('photo', 'video')),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index gallery_items_gallery_id_idx on public.gallery_items (gallery_id);

alter table public.galleries enable row level security;
alter table public.gallery_items enable row level security;

create policy "Los admins gestionan las galerías"
  on public.galleries for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Los admins gestionan los archivos de galería"
  on public.gallery_items for all
  using (public.is_admin())
  with check (public.is_admin());

-- Bucket público (lectura por URL directa, escritura solo admin)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gallery-media', 'gallery-media', true, 209715200,
  array['image/jpeg','image/png','image/webp','image/heic','video/mp4','video/quicktime','video/webm']
)
on conflict (id) do nothing;

create policy "Los admins suben archivos a gallery-media"
  on storage.objects for insert
  with check (bucket_id = 'gallery-media' and public.is_admin());

create policy "Los admins actualizan archivos de gallery-media"
  on storage.objects for update
  using (bucket_id = 'gallery-media' and public.is_admin())
  with check (bucket_id = 'gallery-media' and public.is_admin());

create policy "Los admins borran archivos de gallery-media"
  on storage.objects for delete
  using (bucket_id = 'gallery-media' and public.is_admin());
```

**Nota sobre el plan gratuito**: el plan gratuito de Supabase limita el Storage total del proyecto a 1GB. Fotos y
sobre todo vídeo pueden llenarlo rápido — vigila el uso desde el Dashboard (Storage) y sube de plan si hace falta.
