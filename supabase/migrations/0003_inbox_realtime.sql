-- =============================================================================
-- Fase 3 — Bandeja de entrada omnicanal (Realtime + Human Handoff)
-- =============================================================================
-- Ejecutar DESPUÉS de 0002_auth_onboarding.sql. Es idempotente: puede
-- ejecutarse varias veces sin efectos secundarios.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Mínimo privilegio en conversations
-- -----------------------------------------------------------------------------
-- Desde el dashboard sólo se cambia el modo bot / intervención humana. Las
-- conversaciones las crea el backend (webhooks, service_role) y
-- last_message_at lo mantiene el trigger de messages (SECURITY DEFINER), así
-- que un miembro no necesita reasignar cliente, canal ni fechas.
revoke insert, update on public.conversations from authenticated;
grant update (is_bot_active) on public.conversations to authenticated;

drop policy if exists conversations_insert on public.conversations;

-- -----------------------------------------------------------------------------
-- 2. Publicación de Realtime
-- -----------------------------------------------------------------------------
-- Realtime (postgres_changes) evalúa las políticas RLS de SELECT con el JWT de
-- cada suscriptor: un miembro sólo recibe eventos de su propio business_id.
do $$
declare
  v_table text;
begin
  foreach v_table in array array['messages', 'conversations'] loop
    if not exists (
      select 1
        from pg_catalog.pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end;
$$;
