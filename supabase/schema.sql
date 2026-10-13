-- =============================================================================
-- OmniAI SaaS — Esquema multi-tenant con aislamiento por business_id (RLS)
-- =============================================================================
-- Principios de seguridad aplicados:
--   1. RLS habilitado en todas las tablas de `public`.
--   2. El tenant del usuario se resuelve SIEMPRE en el servidor desde auth.uid()
--      (nunca se confía en un business_id enviado por el cliente).
--   3. Claves foráneas compuestas (business_id, id) impiden referencias
--      cruzadas entre tenants aunque alguien adivine un UUID ajeno.
--   4. Las funciones SECURITY DEFINER viven en el esquema `private`, que NO se
--      expone por la API REST, y fijan `search_path = ''`.
--   5. El rol `anon` no tiene privilegios sobre las tablas.
--   6. Los mensajes de la IA y del cliente final se escriben con service_role
--      desde el backend (webhooks); el dashboard sólo puede crear mensajes
--      `human_admin`.
--
-- Idempotencia: pensado para ejecutarse una vez sobre un proyecto limpio
-- (SQL Editor de Supabase o `supabase db reset`).
-- =============================================================================

create extension if not exists btree_gist with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------
create type public.industry_type as enum (
  'restaurant',
  'barbershop',
  'hotel',
  'services',
  'other'
);

create type public.user_role as enum ('owner', 'admin', 'agent');

create type public.reservation_status as enum (
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show'
);

create type public.conversation_channel as enum ('whatsapp', 'voice');

create type public.message_sender_type as enum ('ai', 'human_admin', 'customer');

-- -----------------------------------------------------------------------------
-- Funciones utilitarias (triggers)
-- -----------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.validate_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Invalid timezone: %', new.timezone using errcode = '22023';
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- businesses (tenant raíz)
-- -----------------------------------------------------------------------------
create table public.businesses (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(btrim(name)) between 2 and 120),
  industry_type     public.industry_type not null,
  ai_prompt_context text not null default '' check (char_length(ai_prompt_context) <= 8000),
  timezone          text not null default 'UTC',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger businesses_validate_timezone
  before insert or update of timezone on public.businesses
  for each row execute function private.validate_timezone();

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- users (perfil de miembros del tenant, 1:1 con auth.users)
-- -----------------------------------------------------------------------------
create table public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  role        public.user_role not null default 'agent',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index users_business_id_idx on public.users (business_id);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Helpers de autorización (SECURITY DEFINER para evitar recursión de RLS)
-- -----------------------------------------------------------------------------
create or replace function private.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.business_id from public.users u where u.id = auth.uid();
$$;

create or replace function private.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select u.role from public.users u where u.id = auth.uid();
$$;

create or replace function private.is_business_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_user_role() in ('owner', 'admin'), false);
$$;

revoke all on function private.current_business_id() from public;
revoke all on function private.current_user_role() from public;
revoke all on function private.is_business_admin() from public;
grant execute on function private.current_business_id() to authenticated, service_role;
grant execute on function private.current_user_role() to authenticated, service_role;
grant execute on function private.is_business_admin() to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- customers (consumidor final)
-- -----------------------------------------------------------------------------
create table public.customers (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references public.businesses (id) on delete cascade,
  phone_number        text not null check (phone_number ~ '^\+[1-9][0-9]{6,14}$'),
  full_name           text check (full_name is null or char_length(btrim(full_name)) between 1 and 120),
  loyalty_visits      integer not null default 0 check (loyalty_visits >= 0),
  preferences_summary text check (preferences_summary is null or char_length(preferences_summary) <= 4000),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint customers_business_phone_key unique (business_id, phone_number),
  constraint customers_business_id_id_key unique (business_id, id)
);

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- resources (recursos abstractos: mesas, barberos, habitaciones...)
-- -----------------------------------------------------------------------------
create table public.resources (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 120),
  capacity    integer not null default 1 check (capacity between 1 and 10000),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint resources_business_id_id_key unique (business_id, id)
);

create trigger resources_set_updated_at
  before update on public.resources
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- reservations
-- -----------------------------------------------------------------------------
create table public.reservations (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null,
  resource_id uuid not null,
  start_time  timestamptz not null,
  end_time    timestamptz not null,
  status      public.reservation_status not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint reservations_time_range_check check (end_time > start_time),
  -- FKs compuestas: el cliente y el recurso DEBEN pertenecer al mismo tenant.
  constraint reservations_customer_fkey foreign key (business_id, customer_id)
    references public.customers (business_id, id) on delete cascade,
  constraint reservations_resource_fkey foreign key (business_id, resource_id)
    references public.resources (business_id, id) on delete restrict,
  -- Anti doble-reserva: un recurso no puede tener reservas activas solapadas.
  constraint reservations_no_overlap exclude using gist (
    resource_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  ) where (status in ('pending', 'confirmed'))
);

create index reservations_business_start_idx on public.reservations (business_id, start_time);
create index reservations_customer_idx on public.reservations (business_id, customer_id);

create trigger reservations_set_updated_at
  before update on public.reservations
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- conversations
-- -----------------------------------------------------------------------------
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses (id) on delete cascade,
  customer_id     uuid not null,
  channel         public.conversation_channel not null,
  -- Human Handoff: cuando es false la IA no responde (Fase 3/4).
  is_bot_active   boolean not null default true,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint conversations_business_id_id_key unique (business_id, id),
  constraint conversations_customer_fkey foreign key (business_id, customer_id)
    references public.customers (business_id, id) on delete cascade
);

create index conversations_business_last_msg_idx
  on public.conversations (business_id, last_message_at desc nulls last);
create index conversations_customer_idx on public.conversations (business_id, customer_id);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- messages
-- -----------------------------------------------------------------------------
-- business_id se desnormaliza para RLS eficiente y filtros de Realtime; la FK
-- compuesta garantiza que coincide con el de la conversación.
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses (id) on delete cascade,
  conversation_id uuid not null,
  sender_type     public.message_sender_type not null,
  content         text not null check (char_length(content) between 1 and 4096),
  created_at      timestamptz not null default now(),
  constraint messages_conversation_fkey foreign key (business_id, conversation_id)
    references public.conversations (business_id, id) on delete cascade
);

create index messages_conversation_created_idx on public.messages (conversation_id, created_at);
create index messages_business_idx on public.messages (business_id);

create or replace function private.touch_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id
     and (last_message_at is null or last_message_at < new.created_at);
  return new;
end;
$$;

revoke all on function private.touch_conversation_last_message() from public;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function private.touch_conversation_last_message();

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.businesses    enable row level security;
alter table public.users         enable row level security;
alter table public.customers     enable row level security;
alter table public.resources     enable row level security;
alter table public.reservations  enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;

-- Defensa en profundidad: anon no toca ninguna tabla.
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

-- ---------------------------------------------------------------- businesses
-- Alta sólo vía public.create_business_for_current_user(); sin borrado desde
-- el cliente. id/created_at no son actualizables.
grant select on public.businesses to authenticated;
grant update (name, industry_type, ai_prompt_context, timezone) on public.businesses to authenticated;

create policy businesses_select_own on public.businesses
  for select to authenticated
  using (id = (select private.current_business_id()));

create policy businesses_update_admin on public.businesses
  for update to authenticated
  using (id = (select private.current_business_id()) and (select private.is_business_admin()))
  with check (id = (select private.current_business_id()));

-- --------------------------------------------------------------------- users
-- Lectura de compañeros del mismo tenant. Ningún usuario puede cambiar su
-- business_id; sólo owner/admin pueden cambiar roles de OTROS miembros.
grant select on public.users to authenticated;
grant update (role) on public.users to authenticated;

create policy users_select_same_business on public.users
  for select to authenticated
  using (business_id = (select private.current_business_id()));

create policy users_update_role_by_admin on public.users
  for update to authenticated
  using (
    business_id = (select private.current_business_id())
    and (select private.is_business_admin())
    and id <> (select auth.uid())
    -- Un admin no puede modificar a un owner.
    and (role <> 'owner' or (select private.current_user_role()) = 'owner')
  )
  with check (
    business_id = (select private.current_business_id())
    -- Sólo un owner puede otorgar el rol owner.
    and (role <> 'owner' or (select private.current_user_role()) = 'owner')
  );

-- ------------------------------------------------- tablas de datos del tenant
grant select, insert, update, delete on public.customers     to authenticated;
grant select, insert, update, delete on public.resources     to authenticated;
grant select, insert, update, delete on public.reservations  to authenticated;
-- conversations: las crea el backend (service_role); el dashboard sólo cambia
-- el modo bot / intervención humana (Fase 3).
grant select, delete                 on public.conversations to authenticated;
grant update (is_bot_active)         on public.conversations to authenticated;
grant select, insert                 on public.messages      to authenticated;

-- customers
create policy customers_select on public.customers
  for select to authenticated
  using (business_id = (select private.current_business_id()));
create policy customers_insert on public.customers
  for insert to authenticated
  with check (business_id = (select private.current_business_id()));
create policy customers_update on public.customers
  for update to authenticated
  using (business_id = (select private.current_business_id()))
  with check (business_id = (select private.current_business_id()));
create policy customers_delete_admin on public.customers
  for delete to authenticated
  using (business_id = (select private.current_business_id()) and (select private.is_business_admin()));

-- resources (gestión restringida a owner/admin)
create policy resources_select on public.resources
  for select to authenticated
  using (business_id = (select private.current_business_id()));
create policy resources_insert_admin on public.resources
  for insert to authenticated
  with check (business_id = (select private.current_business_id()) and (select private.is_business_admin()));
create policy resources_update_admin on public.resources
  for update to authenticated
  using (business_id = (select private.current_business_id()) and (select private.is_business_admin()))
  with check (business_id = (select private.current_business_id()));
create policy resources_delete_admin on public.resources
  for delete to authenticated
  using (business_id = (select private.current_business_id()) and (select private.is_business_admin()));

-- reservations
create policy reservations_select on public.reservations
  for select to authenticated
  using (business_id = (select private.current_business_id()));
create policy reservations_insert on public.reservations
  for insert to authenticated
  with check (business_id = (select private.current_business_id()));
create policy reservations_update on public.reservations
  for update to authenticated
  using (business_id = (select private.current_business_id()))
  with check (business_id = (select private.current_business_id()));
create policy reservations_delete_admin on public.reservations
  for delete to authenticated
  using (business_id = (select private.current_business_id()) and (select private.is_business_admin()));

-- conversations
create policy conversations_select on public.conversations
  for select to authenticated
  using (business_id = (select private.current_business_id()));
create policy conversations_update on public.conversations
  for update to authenticated
  using (business_id = (select private.current_business_id()))
  with check (business_id = (select private.current_business_id()));
create policy conversations_delete_admin on public.conversations
  for delete to authenticated
  using (business_id = (select private.current_business_id()) and (select private.is_business_admin()));

-- messages: inmutables; el dashboard sólo crea mensajes de intervención humana.
create policy messages_select on public.messages
  for select to authenticated
  using (business_id = (select private.current_business_id()));
create policy messages_insert_human on public.messages
  for insert to authenticated
  with check (
    business_id = (select private.current_business_id())
    and sender_type = 'human_admin'
  );

-- =============================================================================
-- Onboarding: crear tenant + perfil owner de forma atómica
-- =============================================================================
create or replace function public.create_business_for_current_user(
  p_name          text,
  p_industry_type public.industry_type,
  p_timezone      text default 'UTC'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid         uuid := auth.uid();
  v_business_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if exists (select 1 from public.users where id = v_uid) then
    raise exception 'User already belongs to a business' using errcode = '23505';
  end if;

  insert into public.businesses (name, industry_type, timezone)
  values (btrim(p_name), p_industry_type, p_timezone)
  returning id into v_business_id;

  insert into public.users (id, business_id, role)
  values (v_uid, v_business_id, 'owner');

  return v_business_id;
end;
$$;

revoke all on function public.create_business_for_current_user(text, public.industry_type, text) from public, anon;
grant execute on function public.create_business_for_current_user(text, public.industry_type, text) to authenticated;

-- =============================================================================
-- Realtime (Fase 3): Supabase Realtime respeta las políticas RLS anteriores.
-- =============================================================================
alter publication supabase_realtime add table public.messages, public.conversations;
