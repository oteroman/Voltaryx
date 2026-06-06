# Voltaryx

> El sistema operativo para la excelencia en field service técnico.

Voltaryx es una plataforma SaaS **multitenant**, **offline-first**, diseñada para empresas de field service que venden y mantienen equipos de infraestructura crítica: UPS, estabilizadores, bancos de baterías, aire acondicionado de precisión y tableros eléctricos.

**Misión:** Convertir cada visita técnica en un activo de negocio — datos de calidad, informes automáticos, hallazgos comercializables y memoria institucional que crece con el tiempo.

---

## El problema

Un técnico trabaja 3 horas en campo. Luego pasa 45–90 minutos llenando un informe en papel o Excel, de memoria. Los datos se degradan. Los hallazgos se pierden. Las oportunidades comerciales no se capturan.

**Voltaryx elimina ese tiempo de documentación post-visita.**

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14+ (App Router) + TypeScript |
| Estilos | Tailwind CSS con tokens Voltaryx |
| Componentes | shadcn/ui (customizado) |
| Backend / DB | Supabase (PostgreSQL + RLS + Auth + Storage) |
| Offline | Dexie.js (IndexedDB) + Workbox (Service Workers) |
| Hosting | Vercel |
| Automatización | n8n (self-hosted, VPS Hetzner) |
| AI | Gemini Flash 3 |
| DNS / CDN | Cloudflare |
| Monorepo | Turborepo + pnpm workspaces |

---

## Estructura del repositorio

```
voltaryx/
├── apps/
│   └── web/                    # Aplicación Next.js principal
├── packages/
│   ├── ui/                     # Sistema de diseño Voltaryx (componentes)
│   ├── config/                 # Configuraciones compartidas (TS, ESLint, Tailwind)
│   ├── domain/                 # Lógica de negocio, tipos, utilidades
│   └── workflows/              # Definiciones de workflows n8n (JSON)
├── supabase/
│   ├── migrations/             # Migraciones SQL
│   └── seed/                   # Datos semilla para desarrollo
├── docs/                       # Documentación técnica por módulo
├── agents/                     # Definiciones y prompts de agentes
├── AGENTS.md                   # Sistema de agentes
├── PRODUCT.md                  # Definición de producto
├── DESIGN.md                   # Sistema de diseño
├── ARCHITECTURE.md             # Arquitectura técnica
└── ROADMAP.md                  # Hoja de ruta
```

---

## Documentación estratégica

| Documento | Contenido |
|---|---|
| [PRODUCT.md](./PRODUCT.md) | Visión, usuarios, módulos, flujos, métricas |
| [DESIGN.md](./DESIGN.md) | Sistema de diseño, UX principles, identidad visual |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Stack, schema, offline strategy, automatizaciones |
| [ROADMAP.md](./ROADMAP.md) | MVP, V1, V2, quick wins, criterios de done |
| [AGENTS.md](./AGENTS.md) | Sistema de agentes y gobernanza |

---

## Inicio rápido

### Requisitos
- Node.js 20+
- pnpm 9+
- Cuenta en Supabase
- Cuenta en Vercel

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/oteroman/Voltaryx.git
cd Voltaryx

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp apps/web/.env.example apps/web/.env.local
# Editar .env.local con tus credenciales de Supabase

# Aplicar migraciones de base de datos
pnpm supabase:migrate

# Iniciar en desarrollo
pnpm dev
```

### Comandos principales

```bash
pnpm dev              # Inicia todos los apps en desarrollo
pnpm build            # Build de producción
pnpm lint             # Linting en todo el monorepo
pnpm type-check       # Type checking en todo el monorepo
pnpm test             # Tests en todo el monorepo
pnpm supabase:migrate # Aplica migraciones pendientes
pnpm supabase:types   # Genera tipos TypeScript desde Supabase
```

---

## Módulos del producto

| Módulo | Estado | Fase |
|---|---|---|
| Field Work Orders | 🔨 En construcción | MVP |
| Technical Report Engine | ⏳ Planificado | MVP |
| Customers, Sites & Assets | ⏳ Planificado | MVP |
| Tenant Administration | ⏳ Planificado | MVP |
| Findings & Recommendations | ⏳ Planificado | V1 |
| Contracts & Maintenance | ⏳ Planificado | V1 |
| Supervisor Dashboard | ⏳ Planificado | V1 |
| Sales Handoff / Opportunities | ⏳ Planificado | V2 |
| Analytics & Productivity | ⏳ Planificado | V2 |
| AI Enablement (Gemini) | ⏳ Planificado | V1+ |

---

## Principios de desarrollo

1. **UX primero.** Diseñado para técnicos en campo, no para oficinas.
2. **Offline-first real.** No caches simples — continuidad operativa completa.
3. **Multitenancy desde el inicio.** RLS en todas las tablas, sin excepciones.
4. **Calidad no negociable.** El producto debe sentirse premium en cada pantalla.
5. **AI como asistente.** Gemini asiste, nunca reemplaza el juicio técnico.
6. **Documentar es parte del done.** Ningún módulo cierra sin documentación actualizada.

---

## Gobernanza del proyecto

Este proyecto usa un sistema de **agentes especializados coordinados por un Orchestrator Agent**.

Antes de contribuir a cualquier módulo, leer [AGENTS.md](./AGENTS.md) para entender:
- El flujo de coordinación obligatorio
- Las zonas protegidas que requieren aprobación
- Las reglas de paralelismo y escalamiento

---

## Licencia

Propietario — Voltaryx © 2024. Todos los derechos reservados.
