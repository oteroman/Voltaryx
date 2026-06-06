# Módulo: Field Work Orders — Blueprint completo

> Documento del UX Design Agent + Data Model Agent + Frontend Agent
> Aprobado por Orchestrator Agent

---

## Por qué este módulo primero

El problema central de Voltaryx es el tiempo perdido en documentación post-visita. Este módulo es la respuesta directa. Todo lo demás (informes, hallazgos, oportunidades comerciales) depende de que la captura de datos en campo sea rápida, confiable y completa.

**Si este módulo falla, el producto no tiene razón de existir.**

---

## Objetivo del módulo

Un técnico puede recibir, ejecutar y cerrar una orden de trabajo completa desde su móvil — sin conexión a internet — y los datos quedan disponibles para generar el informe automáticamente.

**Métrica de éxito:** Tiempo de documentación durante/post visita < 5 minutos.

---

## Blueprint del flujo móvil del técnico

### Estado: ANTES de la visita

```
╔══════════════════════════════════════╗
║  MIS ÓRDENES             [hoy]       ║
╠══════════════════════════════════════╣
║                                      ║
║  ● WO-2024-0042  PROGRAMADA          ║
║  Empresa ABC — Sede Miraflores       ║
║  Preventivo UPS  ·  09:00            ║
║                                      ║
║  ● WO-2024-0043  PROGRAMADA          ║
║  Tech Corp — Sede San Isidro         ║
║  Correctivo Tablero  ·  14:00        ║
║                                      ║
╚══════════════════════════════════════╝
```

**Principios UX de esta pantalla:**
- La orden más próxima al horario actual aparece primero
- Color de prioridad visible en el punto izquierdo (critical=rojo, normal=volt)
- Dirección del site en texto, no solo nombre del cliente
- Tap en la orden → va al detalle

---

### Estado: DETALLE de orden (pre-ejecución)

```
╔══════════════════════════════════════╗
║  ← WO-2024-0042              [mapa]  ║
╠══════════════════════════════════════╣
║  EMPRESA ABC                         ║
║  Sede Miraflores                     ║
║  Av. Larco 1234, piso 3              ║
║                                      ║
║  ─── Acceso ─────────────────────── ║
║  Pedir credencial en recepción.      ║
║  Contactar a María Quispe: 987654321 ║
║                                      ║
║  ─── Equipos a revisar ────────────  ║
║  · UPS APC Smart 10kVA  (SN: X1234) ║
║  · Banco de baterías  (SN: B5678)   ║
║                                      ║
║  ─── Última visita ────────────────  ║
║  23 Feb 2024 · por Carlos Mendoza    ║
║  Hallazgo: batería 3 degradada       ║
║                                      ║
║  ┌────────────────────────────────┐  ║
║  │   EN CAMINO AL SITIO     →    │  ║
║  └────────────────────────────────┘  ║
╚══════════════════════════════════════╝
```

**Principios UX de esta pantalla:**
- El técnico ve el contexto crítico ANTES de llegar (notas de acceso, historial)
- "Última visita" da contexto operativo inmediato
- Un solo botón primario grande: EN CAMINO. Sin ambigüedad.
- El mapa abre la dirección en Google Maps / Waze

---

### Estado: EN CAMINO → EN SITIO

Al tocar "EN CAMINO":
- La orden registra `started_at` automáticamente
- El técnico ve un estado minimalista: "En camino a Empresa ABC"
- Al llegar: toca "LLEGUÉ AL SITIO" → registra `arrived_at`

**Solo 2 taps de estado antes de empezar a trabajar.**

---

### Estado: EJECUCIÓN — Selección de equipo

```
╔══════════════════════════════════════╗
║  ← WO-2024-0042   EN PROGRESO        ║
╠══════════════════════════════════════╣
║  Equipos a revisar:                  ║
║                                      ║
║  ┌─────────────────────────────────┐ ║
║  │ UPS APC Smart 10kVA             │ ║
║  │ SN: X1234 · Sala Servidores     │ ║
║  │ ○ Pendiente                    >│ ║
║  └─────────────────────────────────┘ ║
║                                      ║
║  ┌─────────────────────────────────┐ ║
║  │ Banco de baterías               │ ║
║  │ SN: B5678 · Sala Servidores     │ ║
║  │ ○ Pendiente                    >│ ║
║  └─────────────────────────────────┘ ║
║                                      ║
╚══════════════════════════════════════╝
```

---

### Estado: EJECUCIÓN — Checklist por equipo

```
╔══════════════════════════════════════╗
║  ← UPS APC Smart 10kVA  (5 de 12)   ║
║  ▓▓▓▓▓▓░░░░░░░░░░  42%              ║
╠══════════════════════════════════════╣
║                                      ║
║  ESTADO GENERAL                      ║
║  ┌─────────────────────────────────┐ ║
║  │ ✓ Revisión visual exterior      │ ║
║  │   OK — sin daños visibles       │ ║
║  └─────────────────────────────────┘ ║
║                                      ║
║  MEDICIONES ELÉCTRICAS               ║
║  ┌─────────────────────────────────┐ ║
║  │ Tensión de entrada              │ ║
║  │ [   220.4   ] V                 │ ║
║  │ Rango normal: 210–230V  ✓       │ ║
║  └─────────────────────────────────┘ ║
║                                      ║
║  ┌─────────────────────────────────┐ ║
║  │ Tensión de salida               │ ║
║  │ [         ] V                   │ ║
║  └─────────────────────────────────┘ ║
║                                      ║
║  ┌─────────────────────────────────┐ ║
║  │ 📷  Agregar foto de este ítem   │ ║
║  └─────────────────────────────────┘ ║
║                                      ║
╚══════════════════════════════════════╝
```

**Principios UX críticos:**
- Barra de progreso siempre visible (no tabs ni acordeones)
- Los valores con rango muestran validación en tiempo real (verde/rojo)
- Los campos numéricos abren teclado numérico automáticamente
- La unidad (V, A, °C) siempre visible junto al campo — nunca en placeholder
- Foto disponible en cada ítem sin salir del flujo
- Guardar automático al salir de cada campo

---

### Estado: CAPTURA DE FOTO

```
╔══════════════════════════════════════╗
║  × Cancelar              Tensión...  ║
╠══════════════════════════════════════╣
║                                      ║
║  ┌─────────────────────────────────┐ ║
║  │                                 │ ║
║  │         [VISOR CÁMARA]          │ ║
║  │                                 │ ║
║  │                                 │ ║
║  └─────────────────────────────────┘ ║
║                                      ║
║             ◉  CAPTURAR             ║
║                                      ║
║   [foto 1]  [foto 2]  [+ agregar]   ║
║                                      ║
╚══════════════════════════════════════╝
```

**Principios UX:**
- El visor ocupa toda la pantalla disponible
- El botón de captura está centrado y grande (toque fácil)
- Las fotos tomadas se muestran como thumbnails debajo
- Al confirmar → vuelve al checklist con el ícono de cámara en verde

---

### Estado: REGISTRO DE HALLAZGO

```
╔══════════════════════════════════════╗
║  ← Nuevo hallazgo                    ║
╠══════════════════════════════════════╣
║                                      ║
║  Criticidad                          ║
║  ┌──────┐ ┌──────┐ ┌──────┐ ┌─────┐ ║
║  │CRÍTICO│ │MAYOR │ │MENOR │ │INFO │ ║
║  └──────┘ └──────┘ └──────┘ └─────┘ ║
║                                      ║
║  ¿Qué encontraste?                   ║
║  ┌─────────────────────────────────┐ ║
║  │ Batería 3 presenta tensión      │ ║
║  │ inferior a 10.5V en reposo...   │ ║
║  └─────────────────────────────────┘ ║
║                                      ║
║  Recomendación                       ║
║  ┌─────────────────────────────────┐ ║
║  │ Reemplazar batería 3 en máximo  │ ║
║  │ 30 días para evitar falla...    │ ║
║  └─────────────────────────────────┘ ║
║                                      ║
║  ✨ Asistir con Gemini               ║
║                                      ║
║  ┌────────────────────────────────┐  ║
║  │        GUARDAR HALLAZGO        │  ║
║  └────────────────────────────────┘  ║
╚══════════════════════════════════════╝
```

**Principios UX:**
- Criticidad como selector visual (no dropdown)
- El campo de texto es grande y sin restricciones de longitud
- "Asistir con Gemini" es opcional y claramente identificado
- Un hallazgo crítico genera automáticamente una notificación al supervisor

---

### Estado: FIRMA DEL CLIENTE

```
╔══════════════════════════════════════╗  ← Fondo BLANCO en esta pantalla
║                              09:47   ║
╠══════════════════════════════════════╣
║                                      ║
║  Resumen de la visita                ║
║  ─────────────────────               ║
║  ✓ UPS APC Smart 10kVA — completado  ║
║  ✓ Banco de baterías — completado    ║
║  ⚠ 1 hallazgo registrado (mayor)    ║
║  📷 8 fotos capturadas               ║
║                                      ║
║  Firma de conformidad                ║
║  ─────────────────────               ║
║  Nombre: María Quispe García         ║
║  Cargo:  [Jefa de Infraestructura]   ║
║                                      ║
║  ┌─────────────────────────────────┐ ║
║  │                                 │ ║
║  │     [ÁREA DE FIRMA — CANVAS]    │ ║
║  │                                 │ ║
║  └─────────────────────────────────┘ ║
║            Limpiar firma             ║
║                                      ║
║  ┌────────────────────────────────┐  ║
║  │      CERRAR VISITA   ✓         │  ║
║  └────────────────────────────────┘  ║
╚══════════════════════════════════════╝
```

**Principios UX:**
- Fondo blanco (excepción al tema oscuro) para máxima claridad al cliente
- Resumen de lo hecho antes de la firma — el cliente sabe qué está firmando
- El nombre del firmante se pre-llena desde el contacto del site
- Área de firma grande y reactiva al touch
- Al cerrar: timestamp irremovible se graba en la firma

---

## Backlog inicial priorizado (M1)

### Sprint 1 — Core mínimo funcional

| ID | Story | Agente | Puntos |
|---|---|---|---|
| WO-01 | Como técnico, quiero ver mis órdenes del día al abrir la app | Frontend | 3 |
| WO-02 | Como técnico, quiero ver el detalle completo de una orden antes de ir | Frontend | 3 |
| WO-03 | Como técnico, quiero cambiar el estado de la orden (en camino, en sitio, en progreso) | Frontend + Offline | 5 |
| WO-04 | Como técnico, quiero ejecutar el checklist de un equipo con campos de texto y número | Frontend | 8 |
| WO-05 | Como técnico, quiero que los campos se guarden automáticamente sin tocar "guardar" | Offline | 5 |
| WO-06 | Como técnico, quiero tomar fotos y asociarlas a un ítem del checklist | Frontend + Offline | 8 |
| WO-07 | Como técnico, quiero ver el progreso del checklist en tiempo real | Frontend | 2 |
| WO-08 | Como técnico, quiero cerrar la orden con la firma del cliente | Frontend | 8 |
| WO-09 | Como técnico, quiero que todo funcione sin conexión a internet | Offline | 13 |
| WO-10 | Como técnico, quiero que los datos sincronicen solos cuando tenga señal | Offline | 8 |

**Total Sprint 1: 63 puntos**

### Sprint 2 — Calidad y hallazgos

| ID | Story | Agente | Puntos |
|---|---|---|---|
| WO-11 | Como técnico, quiero registrar hallazgos con criticidad y recomendación | Frontend | 5 |
| WO-12 | Como técnico, quiero ver el historial de la última visita al mismo activo | Frontend | 3 |
| WO-13 | Como técnico, quiero que los valores fuera de rango se marquen visualmente | Frontend | 3 |
| WO-14 | Como técnico, quiero registrar repuestos usados en la visita | Frontend | 3 |
| WO-15 | Como técnico, quiero ver el indicador de conectividad siempre visible | Frontend | 2 |
| WO-16 | Como supervisor, quiero recibir notificación cuando se cierre una orden | Backend + n8n | 5 |
| WO-17 | Como supervisor, quiero ver el estado de todas las órdenes del día | Frontend | 5 |

**Total Sprint 2: 26 puntos**

---

## Modelo de datos inicial (M1)

### Entidades necesarias para este módulo

```
tenants          → aislamiento base
profiles         → técnicos, supervisores
customers        → clientes
sites            → sedes
asset_types      → tipos de equipo + checklist template
assets           → equipos instalados
work_orders      → órdenes de trabajo (entidad central)
work_order_assets → equipos visitados en la orden
photos           → evidencia fotográfica
findings         → hallazgos técnicos
```

### Campos críticos de work_orders para el flujo del técnico

```sql
status:           scheduled | in_transit | on_site | in_progress | completed
started_at:       timestamptz  -- cuando toca "en camino"
arrived_at:       timestamptz  -- cuando toca "llegué al sitio"
completed_at:     timestamptz  -- cuando el cliente firma
checklist_data:   jsonb        -- respuestas al checklist
parameters:       jsonb        -- mediciones técnicas
customer_signature_url:  text  -- path en Storage
customer_signatory_name: text
signed_at:        timestamptz
```

### Schema local (Dexie — offline)

```typescript
db.version(1).stores({
  workOrders:      '++localId, &remoteId, status, assignedTo, scheduledDate, syncStatus',
  workOrderAssets: '++localId, workOrderLocalId, assetId',
  checklistItems:  '++localId, workOrderAssetLocalId',
  photos:          '++localId, workOrderLocalId, syncStatus, [workOrderLocalId+syncStatus]',
  findings:        '++localId, workOrderLocalId, syncStatus',
  syncQueue:       '++id, entityType, action, createdAt, attempts',
})
```

---

## Rutas y pantallas (Next.js App Router)

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx            # Magic link login
│   └── verify/
│       └── page.tsx            # Verificación de link
│
└── (app)/
    ├── layout.tsx              # Layout con bottom nav (mobile) / sidebar (desktop)
    │
    ├── orders/
    │   ├── page.tsx            # Lista de órdenes del técnico
    │   └── [id]/
    │       ├── page.tsx        # Detalle de orden
    │       ├── execute/
    │       │   └── page.tsx    # Flujo de ejecución
    │       ├── assets/
    │       │   └── [assetId]/
    │       │       └── page.tsx # Checklist por equipo
    │       ├── findings/
    │       │   └── new/
    │       │       └── page.tsx # Nuevo hallazgo
    │       └── signature/
    │           └── page.tsx    # Pantalla de firma
    │
    ├── assets/
    │   └── page.tsx            # Listado de activos (lectura)
    │
    └── profile/
        └── page.tsx            # Perfil del técnico
```

---

## Estrategia offline — M1

### Flujo completo sin conexión

```
Técnico abre app (offline)
  ↓
Carga órdenes desde IndexedDB (Dexie)
  ↓
Técnico ejecuta checklist → guarda en IndexedDB
  ↓
Técnico toma fotos → guarda en IndexedDB como blob
  ↓
Técnico firma → guarda firma como DataURL en IndexedDB
  ↓
Orden marcada como "completed" en IndexedDB
  ↓
SyncQueue recibe: [update:work_order, upload:photos, upload:signature]
  ↓
Al reconectar: procesa cola en orden
  1. PATCH work_order → Supabase
  2. Upload fotos → Supabase Storage (una a una, con retry)
  3. Upload firma → Supabase Storage
  4. Trigger: n8n genera PDF y envía email
  ↓
IndexedDB actualiza syncStatus a "synced"
  ↓
Indicador muestra "Sincronizado" por 3s
```

### Gestión de cola de sync

```typescript
interface SyncQueueItem {
  id: string
  entityType: 'work_order' | 'photo' | 'signature' | 'finding'
  entityId: string
  action: 'create' | 'update' | 'upload'
  payload: unknown
  attempts: number          // reintentos realizados
  maxAttempts: number       // 5 por defecto
  nextRetryAt: string       // backoff exponencial: 1s, 2s, 4s, 8s, 16s
  lastError?: string
  createdAt: string
}
```

### Conflictos

**Regla de conflicto M1 (simple):** El técnico tiene precedencia sobre el servidor durante la ejecución de la orden. Si el supervisor reasigna la orden mientras el técnico está offline, la reasignación se aplica SOLO si la orden no ha sido marcada como "in_progress" localmente.

---

## Primeros componentes UI a construir

**Orden de construcción — del más crítico al menos:**

### 1. `<ConnectivityIndicator />`
Siempre visible. Nunca bloquea. Solo informa.
```tsx
// Estados: online | offline | syncing | error
// Posición: header, izquierda
// Tamaño: compacto (punto + texto sm)
```

### 2. `<OrderCard />`
El ítem de la lista de órdenes.
```tsx
// Props: status, customerName, siteName, address, type, priority, scheduledTime
// Tap area: 100% del card
// Altura mínima: 80px
```

### 3. `<ChecklistItem />`
El componente más usado en toda la app.
```tsx
// Tipos: boolean (toggle) | number (input numérico) | text | select
// Siempre muestra unidad si aplica
// Validación de rango en tiempo real
// Foto integrada
// Altura mínima: 52px
// Auto-save on blur
```

### 4. `<ParameterInput />`
Input especializado para mediciones técnicas.
```tsx
// Abre teclado numérico (inputMode="decimal")
// Muestra rango normal debajo del valor
// Color de validación: verde (ok) / rojo (fuera de rango)
// Unidad fija visible a la derecha del input
```

### 5. `<StatusBadge />`
Badge de estado de orden.
```tsx
// scheduled: gris
// in_transit: azul acero
// on_site / in_progress: volt
// completed: verde
// cancelled: rojo
// approved: verde con check
```

### 6. `<SignaturePad />`
Canvas para firma digital.
```tsx
// Fondo blanco (excepción al tema oscuro)
// Smooth line con presión simulada
// Botón "limpiar" siempre visible
// Export como PNG DataURL
// Mínimo 300x150px de área útil
```

### 7. `<PhotoCapture />`
Captura de fotos integrada al flujo.
```tsx
// Abre cámara nativa (getUserMedia)
// Compresión automática: max 1200px, calidad 85%
// Thumbnails de fotos tomadas
// Tap en thumbnail: ver a pantalla completa
// Long press: eliminar
```

### 8. `<SyncQueue />` (invisible para el usuario)
Servicio de sincronización en background.
```typescript
// Procesa la cola cuando hay conexión
// Retry con backoff exponencial
// Notifica al store cuando completa
// Loguea errores para debug
```

---

## Criterio de done del módulo M1

- [ ] Técnico externo puede completar una Work Order sin instrucciones
- [ ] Funciona completamente offline durante 4 horas
- [ ] Sincroniza correctamente al reconectar sin pérdida de datos
- [ ] Las fotos se asocian correctamente a los ítems del checklist
- [ ] La firma se graba con timestamp y nombre del firmante
- [ ] El estado de la orden es correcto en Supabase al final del flujo
- [ ] Funciona en iPhone SE (375px) con una sola mano
- [ ] Todos los elementos interactivos tienen área de toque ≥ 44px
- [ ] Sin errores de TypeScript (strict mode)
- [ ] ConnectivityIndicator visible en todas las pantallas del flujo
- [ ] QA Agent ha revisado y aprobado
