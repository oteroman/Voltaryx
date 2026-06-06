# ARCHITECTURE.md — Arquitectura Técnica Voltaryx

> Documento mantenido por el Data Model & Multitenancy Agent y el Orchestrator.

---

## Principios arquitecturales

1. **Multitenant by design.** El aislamiento de datos por tenant es arquitectónico, no una feature.
2. **Offline-first.** La app funciona sin conexión. La sync es eventual, no bloqueante.
3. **Security by default.** RLS habilitado en todas las tablas desde el inicio. Sin excepciones.
4. **Edge-first.** El contenido estático y la lógica liviana se sirven desde el edge.
5. **Automatización desacoplada.** Los workflows de n8n son independientes del core de la app.
6. **AI como capa adicional.** Gemini es una capa de enriquecimiento, no una dependencia crítica.

---

## Stack tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Frontend | Next.js 14+ (App Router) | SSR/SSG, edge runtime, excelente DX |
| Lenguaje | TypeScript (strict) | Seguridad de tipos end-to-end con Supabase |
| Estilos | Tailwind CSS + tokens Voltaryx | Velocidad de desarrollo con sistema propio |
| Componentes base | shadcn/ui (customizado) | Componentes accesibles, sin lock-in |
| Estado local | Zustand | Ligero, sin boilerplate, predecible |
| Server state | TanStack Query v5 | Cache, sync, optimistic updates |
| Offline storage | Dexie.js (IndexedDB) | API Promise-based, schema versionado |
| PWA / Sync | Workbox (via next-pwa) | Service Workers maduros, estrategias de cache |
| Backend / DB | Supabase (PostgreSQL) | RLS, Auth, Storage, Realtime — todo integrado |
| Auth | Supabase Auth | JWT, magic link, OAuth2 |
| Storage | Supabase Storage | Fotos y PDFs con control de acceso por tenant |
| Hosting | Vercel | Edge network, CI/CD automático desde GitHub |
| Automatización | n8n (Docker, VPS Hetzner) | Self-hosted, workflows visuales, webhooks |
| AI | Gemini Flash 3 (Google AI) | Velocidad, costo, capacidades multimodales |
| DNS / CDN | Cloudflare | DNS, WAF, caché de edge |

---

## Arquitectura de alto nivel

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTE (Browser / PWA)               │
│                                                          │
│  Next.js App          IndexedDB (Dexie)                 │
│  ┌──────────┐         ┌────────────────┐                │
│  │ App      │◄───────►│ Local Cache    │                │
│  │ Router   │         │ Work Orders    │                │
│  │          │         │ Assets         │                │
│  │ Zustand  │         │ Sync Queue     │                │
│  │ TanStack │         └────────────────┘                │
│  └────┬─────┘                 ▲                         │
│       │                       │ Service Worker          │
└───────┼───────────────────────┼─────────────────────────┘
        │ HTTPS                 │ Sync
        ▼                       ▼
┌─────────────────────────────────────────────────────────┐
│                        VERCEL EDGE                       │
│                                                          │
│  Next.js API Routes / Server Actions                     │
│  Edge Middleware (auth, tenant resolution)               │
└─────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│                       SUPABASE                           │
│                                                          │
│  PostgreSQL + RLS          Supabase Auth                │
│  ┌─────────────────┐       ┌──────────────┐            │
│  │ tenants         │       │ JWT tokens   │            │
│  │ users           │       │ Sessions     │            │
│  │ work_orders     │       └──────────────┘            │
│  │ assets          │                                    │
│  │ findings        │       Supabase Storage             │
│  │ contracts       │       ┌──────────────┐            │
│  │ reports         │       │ /photos/     │            │
│  └─────────────────┘       │ /pdfs/       │            │
│                             │ /signatures/ │            │
│  Realtime (WebSockets)      └──────────────┘            │
│  Database Webhooks → n8n                                 │
└─────────────────────────────────────────────────────────┘
        │ Webhooks
        ▼
┌─────────────────────────────────────────────────────────┐
│                    VPS HETZNER (Docker)                  │
│                                                          │
│  n8n                                                     │
│  ┌────────────────────────────────────────────────┐     │
│  │ Workflow: Generar PDF al cerrar orden          │     │
│  │ Workflow: Enviar informe por email             │     │
│  │ Workflow: Crear oportunidad desde hallazgo     │     │
│  │ Workflow: Alerta de vencimiento de contrato    │     │
│  │ Workflow: Handoff comercial                    │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
│  Gemini API ◄─── contexto de visita ──── n8n            │
└─────────────────────────────────────────────────────────┘
```

---

## Modelo de datos

### Estrategia de multitenancy

**Approach: Row-Level Security (RLS) con tenant_id en cada tabla.**

No usamos schemas separados por tenant (demasiado overhead operacional a escala). Usamos una sola base de datos con `tenant_id` como columna de particionamiento y RLS que garantiza aislamiento absoluto.

Cada request incluye el JWT del usuario. Supabase extrae el `tenant_id` del JWT y RLS filtra automáticamente todas las queries.

```sql
-- Función helper para obtener tenant_id del JWT
CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID;
$$ LANGUAGE sql STABLE;
```

---

### Schema completo

```sql
-- ================================================
-- TENANTS
-- ================================================
CREATE TABLE tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,           -- para subdominios futuros
  name            TEXT NOT NULL,
  logo_url        TEXT,
  primary_color   TEXT DEFAULT '#C8FF00',
  plan            TEXT DEFAULT 'starter',         -- starter | pro | enterprise
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- PROFILES (extensión de auth.users)
-- ================================================
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  full_name       TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'technician',
  -- roles: super_admin | tenant_admin | supervisor | technician | commercial
  avatar_url      TEXT,
  phone           TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS para profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_tenant_isolation" ON profiles
  FOR ALL USING (tenant_id = auth.tenant_id());

-- ================================================
-- CUSTOMERS (clientes finales del tenant)
-- ================================================
CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  name            TEXT NOT NULL,
  tax_id          TEXT,                           -- RUC / NIT
  industry        TEXT,
  tier            TEXT DEFAULT 'standard',        -- vip | premium | standard
  notes           TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_tenant_isolation" ON customers
  FOR ALL USING (tenant_id = auth.tenant_id());

-- ================================================
-- SITES (sedes / ubicaciones del cliente)
-- ================================================
CREATE TABLE sites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  name            TEXT NOT NULL,
  address         TEXT,
  city            TEXT,
  country         TEXT DEFAULT 'PE',
  lat             NUMERIC(10, 7),
  lng             NUMERIC(10, 7),
  access_notes    TEXT,                           -- instrucciones de acceso para técnico
  primary_contact TEXT,
  primary_phone   TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sites_tenant_isolation" ON sites
  FOR ALL USING (tenant_id = auth.tenant_id());

-- ================================================
-- ASSET_TYPES (catálogo de tipos de equipos)
-- ================================================
CREATE TABLE asset_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  category        TEXT NOT NULL,
  -- ups | stabilizer | battery_bank | precision_ac | panel | other
  name            TEXT NOT NULL,
  checklist_template JSONB,                       -- plantilla de checklist por tipo
  parameter_template JSONB,                       -- parámetros estándar a medir
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE asset_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asset_types_tenant_isolation" ON asset_types
  FOR ALL USING (tenant_id = auth.tenant_id());

-- ================================================
-- ASSETS (equipos instalados)
-- ================================================
CREATE TABLE assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  site_id         UUID NOT NULL REFERENCES sites(id),
  asset_type_id   UUID REFERENCES asset_types(id),
  brand           TEXT,
  model           TEXT,
  serial_number   TEXT,
  capacity        TEXT,                           -- ej: "10 kVA", "200Ah"
  installation_date DATE,
  warranty_expiry   DATE,
  status          TEXT DEFAULT 'operational',
  -- operational | degraded | critical | decommissioned
  notes           TEXT,
  metadata        JSONB,                          -- datos específicos del modelo
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assets_tenant_isolation" ON assets
  FOR ALL USING (tenant_id = auth.tenant_id());

CREATE INDEX idx_assets_site ON assets(site_id);
CREATE INDEX idx_assets_tenant ON assets(tenant_id);

-- ================================================
-- CONTRACTS (contratos de mantenimiento)
-- ================================================
CREATE TABLE contracts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  contract_number TEXT,
  type            TEXT NOT NULL,
  -- preventive | corrective | mixed | on_demand
  start_date      DATE NOT NULL,
  end_date        DATE,
  sla_response_hours INT DEFAULT 4,
  visit_frequency TEXT,                           -- monthly | quarterly | biannual | annual
  included_assets UUID[],                         -- IDs de assets incluidos
  terms           TEXT,
  value           NUMERIC(12, 2),
  currency        TEXT DEFAULT 'PEN',
  status          TEXT DEFAULT 'active',
  -- draft | active | expiring | expired | cancelled
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contracts_tenant_isolation" ON contracts
  FOR ALL USING (tenant_id = auth.tenant_id());

-- ================================================
-- WORK_ORDERS (órdenes de trabajo)
-- ================================================
CREATE TABLE work_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  order_number    TEXT UNIQUE NOT NULL,           -- generado: WO-2024-00001
  customer_id     UUID NOT NULL REFERENCES customers(id),
  site_id         UUID NOT NULL REFERENCES sites(id),
  contract_id     UUID REFERENCES contracts(id),
  assigned_to     UUID REFERENCES profiles(id),  -- técnico asignado
  supervised_by   UUID REFERENCES profiles(id),  -- supervisor
  type            TEXT NOT NULL,
  -- preventive | corrective | emergency | inspection
  status          TEXT DEFAULT 'scheduled',
  -- scheduled | in_transit | on_site | in_progress | completed | approved | cancelled
  priority        TEXT DEFAULT 'normal',
  -- low | normal | high | critical
  scheduled_date  DATE,
  scheduled_time  TIME,
  started_at      TIMESTAMPTZ,
  arrived_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,
  travel_minutes  INT,
  work_minutes    INT,
  checklist_data  JSONB,                          -- respuestas del checklist
  parameters      JSONB,                          -- mediciones técnicas
  notes           TEXT,
  customer_signature_url TEXT,
  customer_signatory_name TEXT,
  customer_signatory_role TEXT,
  signed_at       TIMESTAMPTZ,
  report_generated_at TIMESTAMPTZ,
  report_url      TEXT,
  report_sent_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work_orders_tenant_isolation" ON work_orders
  FOR ALL USING (tenant_id = auth.tenant_id());

CREATE INDEX idx_work_orders_tenant ON work_orders(tenant_id);
CREATE INDEX idx_work_orders_assigned ON work_orders(assigned_to);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_date ON work_orders(scheduled_date);

-- ================================================
-- WORK_ORDER_ASSETS (activos visitados en una orden)
-- ================================================
CREATE TABLE work_order_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  work_order_id   UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  asset_id        UUID NOT NULL REFERENCES assets(id),
  checklist_data  JSONB,
  parameters      JSONB,
  condition       TEXT,                           -- good | fair | poor | critical
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE work_order_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work_order_assets_tenant_isolation" ON work_order_assets
  FOR ALL USING (tenant_id = auth.tenant_id());

-- ================================================
-- PHOTOS (evidencia fotográfica)
-- ================================================
CREATE TABLE photos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  work_order_id   UUID REFERENCES work_orders(id) ON DELETE CASCADE,
  work_order_asset_id UUID REFERENCES work_order_assets(id),
  storage_path    TEXT NOT NULL,                  -- path en Supabase Storage
  thumbnail_path  TEXT,
  caption         TEXT,
  taken_at        TIMESTAMPTZ DEFAULT now(),
  taken_by        UUID REFERENCES profiles(id),
  metadata        JSONB,                          -- EXIF, coordenadas GPS
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photos_tenant_isolation" ON photos
  FOR ALL USING (tenant_id = auth.tenant_id());

-- ================================================
-- FINDINGS (hallazgos técnicos)
-- ================================================
CREATE TABLE findings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  work_order_id   UUID NOT NULL REFERENCES work_orders(id),
  asset_id        UUID REFERENCES assets(id),
  severity        TEXT NOT NULL,
  -- critical | major | minor | informational
  category        TEXT,
  -- battery | electrical | mechanical | software | environmental | other
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  recommendation  TEXT,
  urgency         TEXT DEFAULT 'scheduled',
  -- immediate | urgent | scheduled | monitoring
  status          TEXT DEFAULT 'open',
  -- open | acknowledged | resolved | deferred
  commercial_opportunity BOOLEAN DEFAULT false,
  opportunity_id  UUID,                           -- referencia a opportunities si aplica
  ai_suggested    BOOLEAN DEFAULT false,          -- fue sugerido por Gemini
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "findings_tenant_isolation" ON findings
  FOR ALL USING (tenant_id = auth.tenant_id());

-- ================================================
-- OPPORTUNITIES (oportunidades comerciales)
-- ================================================
CREATE TABLE opportunities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  source_finding_id UUID REFERENCES findings(id),
  title           TEXT NOT NULL,
  description     TEXT,
  estimated_value NUMERIC(12, 2),
  currency        TEXT DEFAULT 'PEN',
  stage           TEXT DEFAULT 'new',
  -- new | contacted | quoted | negotiating | won | lost
  assigned_to     UUID REFERENCES profiles(id),  -- comercial asignado
  due_date        DATE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "opportunities_tenant_isolation" ON opportunities
  FOR ALL USING (tenant_id = auth.tenant_id());
```

---

## Estrategia offline-first

### Capa de almacenamiento local

**Tecnología:** Dexie.js (wrapper de IndexedDB)

```typescript
// schema de la base de datos local
const db = new Dexie('VoltaryxLocal');

db.version(1).stores({
  workOrders:     '++id, status, assignedTo, scheduledDate, syncStatus',
  workOrderAssets: '++id, workOrderId, assetId',
  assets:         '++id, siteId, customerId, syncedAt',
  customers:      '++id, tenantId, syncedAt',
  sites:          '++id, customerId, syncedAt',
  photos:         '++id, workOrderId, syncStatus, localPath',
  syncQueue:      '++id, entityType, entityId, action, createdAt, attempts',
  findings:       '++id, workOrderId, syncStatus',
});
```

### Estrategia de sincronización

**Principio:** Offline-first con sync eventual. El técnico nunca espera a la red.

```
Acción del técnico
      │
      ▼
Guardar en IndexedDB (inmediato)
      │
      ├── Online: sync inmediata a Supabase
      │
      └── Offline: agregar a syncQueue
                       │
                       ▼
               Al reconectar: procesar cola
               con retry exponential backoff
               (1s, 2s, 4s, 8s... max 5 intentos)
```

### Resolución de conflictos

**Estrategia: Last-Write-Wins con timestamp del servidor.**

- Datos de la Work Order: el técnico local tiene precedencia (trabaja sin conexión)
- Asignaciones: el servidor tiene precedencia (el supervisor puede reasignar)
- Fotos: no hay conflicto (append-only, nunca se sobreescriben)

### Datos cacheados offline

| Entidad | TTL cache | Estrategia |
|---|---|---|
| Work Orders asignadas | Hasta cierre | Cache-first, sync al abrir |
| Clientes y sites | 24 horas | Stale-while-revalidate |
| Assets del site | 24 horas | Stale-while-revalidate |
| Checklists y templates | 7 días | Cache-first, update en background |
| Fotos tomadas | Hasta sync | Local hasta confirmar upload |

---

## Estrategia de autenticación

### Flujo

```
Usuario ingresa email
  → Supabase envía magic link
  → Usuario hace click en el link
  → Supabase genera JWT con claims:
    {
      sub: "user-uuid",
      role: "authenticated",
      app_metadata: {
        tenant_id: "tenant-uuid",
        role: "technician"
      }
    }
  → JWT se almacena en localStorage (Next.js client)
  → Service Worker intercepta requests y agrega Authorization header
```

### Sesión offline
El JWT tiene 7 días de expiración. El técnico puede trabajar offline durante ese período sin reautenticarse.

Al reconectar, si el JWT está por expirar (< 1 hora), el cliente hace refresh automático en background.

---

## Estructura de Storage (Supabase)

```
/tenant-{tenant_id}/
  /photos/
    /work-order-{wo_id}/
      /{photo_id}-original.jpg
      /{photo_id}-thumb.jpg
  /signatures/
    /work-order-{wo_id}/
      /signature.png
  /reports/
    /work-order-{wo_id}/
      /report-v1.pdf
  /logos/
    /logo.png
    /logo-dark.png
```

**Políticas de Storage:**
- Técnicos: pueden subir a su tenant, no pueden acceder a otros tenants
- Clientes: pueden descargar PDFs de sus reportes (URL firmada con expiración de 48h)
- Sin acceso público a nada excepto logos de tenants

---

## Arquitectura de automatización (n8n)

### Infraestructura
- n8n self-hosted en VPS Hetzner con Docker Compose
- URL: automatizacion.illarilabs.com
- Autenticación: JWT token

### Workflows principales

#### WF-01: Generar informe al cerrar orden
```
Trigger: Database Webhook (work_orders.status = 'completed')
  → Fetch datos completos de la orden (Supabase API)
  → Fetch fotos y firmas (Supabase Storage)
  → Gemini: generar resumen ejecutivo del informe
  → Generar PDF (HTML → PDF via Puppeteer en n8n)
  → Upload PDF a Supabase Storage
  → Update work_orders.report_url
  → Notificar al supervisor (push notification)
```

#### WF-02: Enviar informe al cliente
```
Trigger: Webhook desde app (supervisor aprueba informe)
  → Fetch PDF desde Storage
  → Fetch datos del cliente y contacto principal
  → Enviar email con PDF adjunto (SMTP / SendGrid)
  → Update work_orders.report_sent_at
  → Log en tabla de comunicaciones
```

#### WF-03: Crear oportunidad desde hallazgo crítico
```
Trigger: Database Webhook (findings INSERT donde severity = 'critical')
  → Fetch datos del hallazgo y cliente
  → Gemini: redactar descripción de oportunidad comercial
  → INSERT en opportunities table
  → Notificar al comercial asignado
  → (Futuro: crear tarea en CRM externo)
```

#### WF-04: Alertas de vencimiento de contratos
```
Trigger: Cron (diario a las 8:00 AM)
  → Query contratos que vencen en 30, 15, 7 días
  → Para cada contrato: notificar al supervisor
  → Para contratos que vencen en 7 días: notificar también al comercial
```

---

## Seguridad

### Principios
1. **RLS en todas las tablas.** Sin excepciones. Verificado en cada migration.
2. **Tenant isolation absoluto.** Un tenant no puede ver datos de otro en ningún escenario.
3. **Mínimo privilegio.** Los técnicos no pueden modificar configuración del tenant ni ver otros técnicos.
4. **Secrets en variables de entorno.** Nunca en código, nunca en repositorio.
5. **Storage con URLs firmadas.** Ningún archivo es públicamente accesible sin autenticación.

### Roles y permisos

| Acción | Técnico | Supervisor | Comercial | Tenant Admin |
|---|---|---|---|---|
| Ver sus órdenes | ✓ | ✓ | — | ✓ |
| Ver todas las órdenes del tenant | — | ✓ | — | ✓ |
| Crear orden | — | ✓ | — | ✓ |
| Ejecutar y completar orden | ✓ | ✓ | — | ✓ |
| Aprobar informe | — | ✓ | — | ✓ |
| Ver oportunidades | — | — | ✓ | ✓ |
| Gestionar clientes y activos | — | ✓ | ✓ (lectura) | ✓ |
| Gestionar contratos | — | ✓ | — | ✓ |
| Gestionar usuarios | — | — | — | ✓ |
| Ver analytics | — | ✓ | ✓ | ✓ |

---

## Estructura del repositorio

```
voltaryx/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Rutas de autenticación
│   │   ├── login/
│   │   └── verify/
│   ├── (tenant)/                 # Rutas protegidas por tenant
│   │   ├── dashboard/
│   │   ├── orders/
│   │   │   ├── [id]/
│   │   │   └── page.tsx
│   │   ├── assets/
│   │   ├── customers/
│   │   ├── contracts/
│   │   ├── findings/
│   │   └── settings/
│   ├── api/                      # API Routes
│   │   ├── webhooks/             # Webhooks de Supabase
│   │   └── reports/              # Generación de PDFs
│   ├── layout.tsx
│   └── globals.css
│
├── components/                   # Componentes de UI
│   ├── ui/                       # Componentes base (shadcn customizado)
│   ├── orders/                   # Componentes de Work Orders
│   ├── assets/                   # Componentes de Activos
│   ├── findings/                 # Componentes de Hallazgos
│   ├── offline/                  # Indicadores de conectividad
│   └── shared/                   # Componentes compartidos
│
├── lib/                          # Lógica de negocio
│   ├── supabase/                 # Cliente Supabase + types
│   ├── offline/                  # Dexie + sync queue
│   ├── ai/                       # Integración Gemini
│   └── utils/                    # Utilidades compartidas
│
├── hooks/                        # React hooks
│   ├── useOfflineSync.ts
│   ├── useWorkOrder.ts
│   └── useConnectivity.ts
│
├── store/                        # Zustand stores
│   ├── useAppStore.ts
│   └── useOfflineStore.ts
│
├── types/                        # TypeScript types
│   ├── database.types.ts         # Auto-generado desde Supabase
│   └── app.types.ts
│
├── supabase/                     # Migraciones y config
│   ├── migrations/
│   └── config.toml
│
├── public/
│   ├── manifest.json             # PWA manifest
│   └── sw.js                     # Service Worker (Workbox)
│
├── AGENTS.md
├── PRODUCT.md
├── DESIGN.md
├── ARCHITECTURE.md
├── ROADMAP.md
├── README.md
├── .env.local                    # Variables de entorno (gitignored)
├── .gitignore
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Variables de entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://iyxruvociyldscbpotdv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-flash-3

# n8n
N8N_WEBHOOK_SECRET=...

# App
NEXT_PUBLIC_APP_URL=https://voltaryx.vercel.app
```

---

## Decisiones técnicas documentadas

| Decisión | Alternativas consideradas | Razón de la elección |
|---|---|---|
| Supabase para backend | Firebase, PlanetScale + Auth0 | RLS nativo, Storage integrado, menor complejidad operacional |
| Dexie.js para offline | Workbox solo, PouchDB | API limpia, TypeScript first, schema versionado |
| n8n self-hosted | Make, Zapier, AWS Lambda | Control total, costo predecible, sin límites de ejecución |
| Gemini Flash 3 | GPT-4o, Claude | Velocidad alta, costo bajo, multimodal para fotos futuras |
| App Router de Next.js | Pages Router, Remix | Server Components, mejor performance, futuro del framework |
| shadcn/ui base | Material UI, Ant Design | Sin lock-in de estilos, componentes accesibles, 100% customizable |
