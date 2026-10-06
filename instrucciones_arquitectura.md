# Product Requirements Document (PRD) & Arquitectura: OmniAI SaaS (Multi-Tenant)

Eres un Staff Engineer de Silicon Valley, un experto en ciberseguridad y un líder en UI/UX. Tu objetivo es codificar un SaaS B2B2C multi-tenant de automatización con Inteligencia Artificial omnicanal, enfocado en escalar operaciones de negocios físicos (restaurantes, barberías, hoteles, servicios). El objetivo es la perfección técnica: cero bugs, máxima seguridad (estándar bancario) y una experiencia premium.

## 1. Modelo de Negocio (B2B2C SaaS)
- **Nosotros (Proveedor):** Mantenemos la infraestructura (Next.js, Supabase) y la IA. Cobramos suscripción.
- **El Cliente (Dueño del negocio - Tenant):** Accede a un Dashboard para gestionar su IA, leer chats (Omnicanal) y tomar el control (Human Handoff).
- **El Consumidor Final:** Interactúa a través de WhatsApp o Voz (Llamadas) sin descargar ninguna app.

## 2. Ventaja Competitiva (UVP)
- **Voz Nativa:** Integración futura con Vapi.ai/Retell AI para llamadas telefónicas.
- **Arquitectura Multi-Vertical Dinámica:** Gestión de "Recursos Abstractos" (mesas, barberos, habitaciones).
- **Upselling Predictivo & Fidelización:** Capacidad para generar Pases de Apple/Google Wallet y enviar mensajes proactivos.

## 3. Stack Tecnológico Obligatorio
- **Frontend:** Next.js (App Router), React, TypeScript estricto.
- **UI/UX:** Tailwind CSS, Shadcn UI (diseño premium, minimalista), Framer Motion (animaciones fluidas 200-300ms), Lucide Icons.
- **Backend/DB:** Supabase (PostgreSQL, Auth, Storage, Edge Functions).
- **Validaciones (Crucial):** Zod (toda entrada al servidor debe validarse).
- **IA & Lógica:** Vercel AI SDK, Anthropic SDK (Claude 3.5 Sonnet para Tool Calling).
- **Automatizaciones/Comunicaciones:** WhatsApp Cloud API (Webhooks), n8n (para tareas en segundo plano), Vapi.ai (futuro).

## 4. Reglas Inquebrantables de Desarrollo (Cero Bugs)
1. **TypeScript Estricto:** Prohibido el uso de `any` o `@ts-ignore`. Interfaces claras.
2. **Validación Absoluta:** Ningún endpoint o form procesa datos sin esquemas Zod.
3. **Seguridad (RLS):** Supabase RLS es obligatorio. Un usuario autenticado solo puede interactuar con los datos de su `business_id` (Tenant isolation).
4. **Protección:** Prevención de inyecciones SQL (uso de ORM/clientes seguros) y manejo de errores con try/catch en asincronía (sin exponer errores crudos).
5. **Calidad de Interfaz:** Feedback visual (hover, active, skeletons, spinners), modo claro/oscuro.

## 5. Plan de Ejecución Metódico (Fases)

**Detente y pide autorización antes de pasar a la siguiente fase.**

### FASE 1: Base de Datos, Seguridad (RLS) y Conexiones Base
1. Configura la utilidad de conexión de Supabase en `utils/supabase` usando `@supabase/ssr` (separando cliente y servidor).
2. Escribe el archivo `/supabase/schema.sql` definiendo las tablas y, **de vital importancia**, las políticas RLS para aislar a los inquilinos (`business_id`):
   - `businesses`: id, name, industry_type, ai_prompt_context, timezone, created_at.
   - `users`: (enlazado a auth.users) id, business_id, role.
   - `customers`: id, business_id, phone_number, full_name, loyalty_visits, preferences_summary.
   - `resources`: id, business_id, name, capacity, is_active.
   - `reservations`: id, business_id, customer_id, resource_id, start_time, end_time, status.
   - `conversations`: id, business_id, customer_id, channel (whatsapp, voice).
   - `messages`: id, conversation_id, sender_type (ai, human_admin, customer), content, created_at.
3. Define los esquemas Zod iniciales en una carpeta `src/schemas/`.

### FASE 2: Autenticación, Layout y UI Base (Shadcn)
1. Instala e inicializa Shadcn UI (agrega: button, input, dialog, table, card, sheet, badge, toast).
2. Desarrolla rutas seguras `/login` y `/register`.
3. Crea el Layout del Dashboard (`/app/dashboard/layout.tsx`) con un Sidebar corporativo y responsivo.
4. Crea la vista `/dashboard/settings` para que el tenant configure su `ai_prompt_context`.

### FASE 3: El CRM Omnicanal (Bandeja de Entrada Híbrida)
1. Construye `/dashboard/inbox` (split view: lista de chats izq., chat activo der.).
2. Implementa **Supabase Realtime** para actualización instantánea de mensajes.
3. Integra el "Toggle" (Botón) de "Modo Bot / Intervención Humana" en el chat.

### FASE 4: Orquestación del Agente IA y Webhooks
1. Desarrolla `/api/webhooks/whatsapp` (recepción, validación, respuesta).
2. Lógica de "Human Handoff": Si "Modo Bot" está apagado, la IA no responde.
3. Instancia Claude 3.5 Sonnet con el `ai_prompt_context`.
4. Implementa el Tool Calling: `check_availability` y `book_reservation`.
