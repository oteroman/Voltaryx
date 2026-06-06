# Orchestrator Agent — Contexto operativo

## Módulo activo
**M0 — Fundaciones** (en curso)

## Decisiones aprobadas
- Stack: Next.js 14 + Supabase + Dexie + n8n + Gemini Flash 3
- Monorepo: Turborepo + pnpm workspaces
- Estructura: apps/web + packages/ui + packages/config + packages/domain + packages/workflows
- Modo de color: dark-first con Volt Yellow (#C8FF00) como acento
- Tipografía: Space Grotesk (display) + DM Sans (UI) + JetBrains Mono (datos técnicos)
- Multitenancy: RLS por tenant_id en cada tabla
- Offline: Dexie.js + Workbox Service Workers + cola de sync

## Próximo módulo
**M1 — Field Work Orders**

## Zonas protegidas activas
- packages/config/tailwind.config.js → tokens del sistema de diseño
- packages/domain/src/types/ → contratos de tipos compartidos
- supabase/migrations/ → schema de base de datos
- apps/web/src/app/layout.tsx → layout raíz (pendiente de crear)

## Log de decisiones
| Fecha | Decisión | Agente | Impacto |
|---|---|---|---|
| 2024 | Monorepo con Turborepo | Orchestrator | Alto — todos los packages |
| 2024 | Volt Yellow como acento | Brand + UX | Alto — design system completo |
| 2024 | Dexie.js para offline | Offline Agent | Alto — estrategia de sync |
| 2024 | RLS desde día 1 | Data Model | Crítico — seguridad |
