-- =============================================================================
-- SÓLO DESARROLLO — Datos de prueba para la bandeja de entrada (Fase 3)
-- =============================================================================
-- Hasta que exista el webhook de WhatsApp (Fase 4) no entran mensajes reales.
-- Este script crea clientes, conversaciones y mensajes de ejemplo en el negocio
-- registrado MÁS RECIENTEMENTE. Ejecútalo en el SQL Editor de Supabase (rol
-- postgres, que omite RLS igual que lo hará el backend con service_role).
--
-- NUNCA lo ejecutes en producción.
-- =============================================================================

do $$
declare
  v_business_id uuid;
  v_customer_1  uuid;
  v_customer_2  uuid;
  v_customer_3  uuid;
  v_conv_1      uuid;
  v_conv_2      uuid;
  v_conv_3      uuid;
begin
  select id into v_business_id from public.businesses order by created_at desc limit 1;
  if v_business_id is null then
    raise exception 'No hay negocios registrados todavía';
  end if;

  insert into public.customers (business_id, phone_number, full_name, loyalty_visits)
  values (v_business_id, '+5215511110001', 'Mariana López', 4)
  on conflict (business_id, phone_number) do update set full_name = excluded.full_name
  returning id into v_customer_1;

  insert into public.customers (business_id, phone_number, full_name, loyalty_visits)
  values (v_business_id, '+5215511110002', 'Carlos Méndez', 1)
  on conflict (business_id, phone_number) do update set full_name = excluded.full_name
  returning id into v_customer_2;

  insert into public.customers (business_id, phone_number, full_name)
  values (v_business_id, '+5215511110003', null)
  on conflict (business_id, phone_number) do update set full_name = excluded.full_name
  returning id into v_customer_3;

  insert into public.conversations (business_id, customer_id, channel)
  values (v_business_id, v_customer_1, 'whatsapp') returning id into v_conv_1;
  insert into public.conversations (business_id, customer_id, channel, is_bot_active)
  values (v_business_id, v_customer_2, 'whatsapp', false) returning id into v_conv_2;
  insert into public.conversations (business_id, customer_id, channel)
  values (v_business_id, v_customer_3, 'voice') returning id into v_conv_3;

  insert into public.messages (business_id, conversation_id, sender_type, content, created_at) values
    (v_business_id, v_conv_1, 'customer', 'Hola, ¿tienen disponibilidad para mañana a las 7pm?', now() - interval '42 minutes'),
    (v_business_id, v_conv_1, 'ai', '¡Hola Mariana! Sí, tenemos lugar mañana a las 7:00 pm. ¿Para cuántas personas sería?', now() - interval '41 minutes'),
    (v_business_id, v_conv_1, 'customer', 'Para 4 personas, por favor.', now() - interval '40 minutes'),
    (v_business_id, v_conv_2, 'customer', 'Quiero hacer una queja sobre mi última visita.', now() - interval '3 hours'),
    (v_business_id, v_conv_2, 'human_admin', 'Hola Carlos, lamentamos mucho lo ocurrido. Cuéntanos qué pasó y lo resolvemos.', now() - interval '2 hours 50 minutes'),
    (v_business_id, v_conv_3, 'customer', '[Llamada transcrita] Quisiera saber el horario del domingo.', now() - interval '1 day'),
    (v_business_id, v_conv_3, 'ai', 'Los domingos abrimos de 10:00 a 18:00. ¿Te ayudo con algo más?', now() - interval '1 day' + interval '1 minute');
end;
$$;

-- =============================================================================
-- Simular un mensaje entrante (para probar Realtime)
-- =============================================================================
-- Con la bandeja abierta en el navegador, ejecuta este bloque: el mensaje debe
-- aparecer al instante en la conversación más reciente sin recargar la página.
--
-- insert into public.messages (business_id, conversation_id, sender_type, content)
-- select c.business_id, c.id, 'customer', 'Mensaje de prueba en tiempo real 👋'
--   from public.conversations c
--  order by c.last_message_at desc nulls last
--  limit 1;
