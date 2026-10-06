-- =============================================================================
-- Fase 2 — Alta automática del tenant al registrarse
-- =============================================================================
-- Ejecutar DESPUÉS de supabase/schema.sql.
--
-- Con confirmación de email activada, signUp() no devuelve sesión, así que el
-- cliente no puede llamar a create_business_for_current_user(). Este trigger
-- crea el negocio y el perfil owner en la misma transacción que el usuario,
-- usando los metadatos enviados en signUp (ya validados con Zod en el servidor
-- y re-validados aquí por los CHECK, el enum y el trigger de timezone).
--
-- Usuarios sin metadatos de negocio (p. ej. invitados o OAuth) se crean sin
-- tenant y completan el alta en /onboarding.
-- =============================================================================

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name        text := nullif(btrim(new.raw_user_meta_data ->> 'business_name'), '');
  v_industry    text := nullif(btrim(new.raw_user_meta_data ->> 'industry_type'), '');
  v_timezone    text := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'timezone'), ''), 'UTC');
  v_business_id uuid;
begin
  if v_name is null or v_industry is null then
    return new;
  end if;

  insert into public.businesses (name, industry_type, timezone)
  values (v_name, v_industry::public.industry_type, v_timezone)
  returning id into v_business_id;

  insert into public.users (id, business_id, role)
  values (new.id, v_business_id, 'owner');

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();
