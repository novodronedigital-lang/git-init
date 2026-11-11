-- ==========================================================
-- workshops / workshop_registrations / workshop_attendees
-- Inscripción a talleres en pueblos/entidades, por enlace privado
-- (/inscripcion?t=<slug>), y correo de valoración + descuento
-- tras el taller, solo a quien dio consentimiento expreso.
--
-- Nada de esto tiene lectura pública por RLS: el formulario
-- público usa las funciones get_open_workshop / register_for_workshop
-- / unsubscribe_workshop_email (security definer), que solo exponen
-- lo justo y nunca permiten listar talleres ni inscripciones.
-- ==========================================================

create table public.workshops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  town text not null,
  location text,
  event_date date not null,
  event_time text,
  description text,
  discount_code text,
  is_open boolean not null default true,
  followup_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.workshop_registrations (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  created_at timestamptz not null default now(),
  contact_name text not null,
  email text not null,
  phone text not null,
  privacy_accepted_at timestamptz not null,
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  unsubscribed_at timestamptz,
  followup_sent_at timestamptz
);

create table public.workshop_attendees (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.workshop_registrations(id) on delete cascade,
  name text not null,
  age integer not null check (age >= 0 and age <= 120),
  position integer not null default 0
);

create index workshop_registrations_workshop_id_idx on public.workshop_registrations (workshop_id);
create index workshop_attendees_registration_id_idx on public.workshop_attendees (registration_id);

alter table public.workshops enable row level security;
alter table public.workshop_registrations enable row level security;
alter table public.workshop_attendees enable row level security;

create policy "Los admins gestionan los talleres"
  on public.workshops for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Los admins gestionan las inscripciones"
  on public.workshop_registrations for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Los admins gestionan los asistentes"
  on public.workshop_attendees for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------
-- Datos públicos de UN taller abierto, solo si se conoce su slug.
-- ----------------------------------------------------------
create function public.get_open_workshop(p_slug text)
returns table (title text, town text, location text, event_date date, event_time text, description text)
language sql
stable
security definer
set search_path = public
as $$
  select w.title, w.town, w.location, w.event_date, w.event_time, w.description
  from public.workshops w
  where w.slug = p_slug and w.is_open;
$$;

-- ----------------------------------------------------------
-- Inscripción atómica: contacto + asistentes, o nada.
-- p_attendees: [{"name": "Lucía", "age": 9}, ...]
-- ----------------------------------------------------------
create function public.register_for_workshop(
  p_slug text,
  p_contact_name text,
  p_email text,
  p_phone text,
  p_privacy_accepted boolean,
  p_marketing_consent boolean,
  p_attendees jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workshop_id uuid;
  v_registration_id uuid;
  v_attendee jsonb;
  v_position integer := 0;
begin
  if not coalesce(p_privacy_accepted, false) then
    raise exception 'Hay que aceptar la política de privacidad';
  end if;

  if coalesce(trim(p_contact_name), '') = '' or coalesce(trim(p_email), '') = '' or coalesce(trim(p_phone), '') = '' then
    raise exception 'Faltan datos de contacto';
  end if;

  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'El email no es válido';
  end if;

  if jsonb_typeof(p_attendees) <> 'array' or jsonb_array_length(p_attendees) = 0 or jsonb_array_length(p_attendees) > 15 then
    raise exception 'Indica entre 1 y 15 personas';
  end if;

  select id into v_workshop_id from public.workshops where slug = p_slug and is_open;
  if v_workshop_id is null then
    raise exception 'Este taller no existe o ya no admite inscripciones';
  end if;

  insert into public.workshop_registrations (
    workshop_id, contact_name, email, phone, privacy_accepted_at, marketing_consent, marketing_consent_at
  )
  values (
    v_workshop_id,
    left(trim(p_contact_name), 120),
    lower(left(trim(p_email), 200)),
    left(trim(p_phone), 40),
    now(),
    coalesce(p_marketing_consent, false),
    case when coalesce(p_marketing_consent, false) then now() end
  )
  returning id into v_registration_id;

  for v_attendee in select * from jsonb_array_elements(p_attendees) loop
    if coalesce(trim(v_attendee->>'name'), '') = '' then
      raise exception 'Falta el nombre de alguna persona';
    end if;
    insert into public.workshop_attendees (registration_id, name, age, position)
    values (v_registration_id, left(trim(v_attendee->>'name'), 120), (v_attendee->>'age')::integer, v_position);
    v_position := v_position + 1;
  end loop;
end;
$$;

-- ----------------------------------------------------------
-- Baja de los correos (enlace en cada email). Idempotente.
-- ----------------------------------------------------------
create function public.unsubscribe_workshop_email(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select email into v_email from public.workshop_registrations where unsubscribe_token = p_token;
  if v_email is null then
    return false;
  end if;

  -- Una baja vale para todas las inscripciones de ese email, no solo la de este taller.
  update public.workshop_registrations
  set unsubscribed_at = coalesce(unsubscribed_at, now()), marketing_consent = false
  where email = v_email;

  return true;
end;
$$;

revoke all on function public.get_open_workshop(text) from public;
revoke all on function public.register_for_workshop(text, text, text, text, boolean, boolean, jsonb) from public;
revoke all on function public.unsubscribe_workshop_email(uuid) from public;

grant execute on function public.get_open_workshop(text) to anon, authenticated;
grant execute on function public.register_for_workshop(text, text, text, text, boolean, boolean, jsonb) to anon, authenticated;
grant execute on function public.unsubscribe_workshop_email(uuid) to anon, authenticated;
