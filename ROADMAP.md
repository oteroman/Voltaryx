# ROADMAP.md — Hoja de Ruta Voltaryx

> Documento mantenido por el Product Strategy Agent y el Orchestrator.
> Las fechas son orientativas. El scope de cada fase es no negociable hasta que el Orchestrator lo modifique.

---

## Filosofía de roadmap

**Velocidad con estándar.** No se sube velocidad bajando la barra de calidad.
El MVP no es una versión pobre del producto. Es la versión más pequeña que resuelve el problema principal con el mismo estándar de excelencia.

**Orden de prioridad:** Impacto en el técnico > Impacto en el supervisor > Impacto comercial > Impacto operativo interno.

---

## Norte estrella del producto

> Un técnico de campo termina su visita en el sitio. Cierra la orden en el móvil. El cliente firma. El informe llega al email del cliente 5 minutos después. El técnico no escribió una sola línea.

Ese es el momento que define el éxito del MVP.

---

## MVP — "El Técnico en Campo"
**Foco:** Reducir a cero el tiempo de documentación post-visita.
**Criterio de éxito:** Un técnico puede completar una visita completa y generar el informe automáticamente, sin redactar nada.

### M0 — Fundaciones (Semana 1–2)

**Objetivo:** El proyecto existe, compila, tiene auth y multitenancy funcionando.

| Entregable | Responsable | Done cuando... |
|---|---|---|
| Repositorio configurado en GitHub | Orchestrator | Branch main con CI/CD en Vercel |
| Next.js 14 + TypeScript + Tailwind inicializado | Frontend Agent | `npm run dev` compila sin errores |
| Sistema de tokens de color y tipografía en Tailwind | Frontend Agent | Tokens de DESIGN.md disponibles en CSS |
| Supabase conectado | Data Model Agent | Cliente Supabase operativo |
| Auth con magic link | Data Model Agent | Login/logout funciona con Supabase Auth |
| Multitenancy base: tabla tenants + RLS | Data Model Agent | tenant_id en JWT, RLS verificado |
| Perfil de usuario con rol | Data Model Agent | Tabla profiles con RLS |
| Layout base mobile + desktop | Frontend Agent | Navegación bottom (mobile) y sidebar (desktop) |
| Service Worker + PWA manifest | Offline Agent | App instalable en móvil |
| IndexedDB (Dexie) inicializado | Offline Agent | Schema local definido y operativo |

---

### M1 — Work Orders (Semana 3–5)

**Objetivo:** El técnico puede recibir, ejecutar y cerrar una orden de trabajo desde el móvil.

| Feature | Descripción | Prioridad |
|---|---|---|
| Lista de órdenes asignadas | Vista móvil de órdenes del técnico actual | P0 |
| Detalle de la orden | Cliente, sitio, tipo, notas de acceso | P0 |
| Cambio de estado de orden | Scheduled → In transit → On site → In progress | P0 |
| Checklist dinámico | Items configurables por tipo de visita | P0 |
| Registro de parámetros técnicos | Campos numéricos por tipo de equipo | P0 |
| Captura de fotos | Cámara directa, asociada al ítem del checklist | P0 |
| Registro de hallazgos | Título, descripción, criticidad, recomendación | P0 |
| Firma digital del cliente | Canvas touch, nombre y cargo del firmante | P0 |
| Cierre de orden | Estado → Completed, datos sellados | P0 |
| Funcionamiento offline completo | Todo lo anterior funciona sin conexión | P0 |
| Sincronización al reconectar | Datos + fotos suben en background | P0 |
| Indicador de conectividad | Banner sutil online/offline/syncing | P1 |
| Registro de tiempo | Arrived_at, started_at, completed_at | P1 |
| Registrar repuestos utilizados | Texto libre por ahora | P2 |

**Definición de done del M1:**
- Un técnico puede completar una Work Order completa sin conexión
- Los datos y fotos sincronizan al reconectar sin pérdida
- La interfaz cumple DESIGN.md en mobile (375px)

---

### M2 — Report Engine (Semana 5–7)

**Objetivo:** El informe sale automáticamente al cerrar la orden. Sin redacción.

| Feature | Descripción | Prioridad |
|---|---|---|
| Trigger de generación al cerrar orden | Webhook Supabase → n8n | P0 |
| Template HTML de informe | Datos de la visita, checklist, fotos, firma | P0 |
| Generación de PDF | HTML → PDF en n8n (Puppeteer) | P0 |
| Storage del PDF en Supabase | Por tenant, por orden | P0 |
| Envío automático por email | Email al contacto principal del cliente | P0 |
| Vista previa del informe en app | Supervisor puede ver antes de enviar | P1 |
| Aprobación del supervisor antes de enviar | Flujo opcional por configuración del tenant | P1 |
| Resumen ejecutivo generado por Gemini | Párrafo introductorio del informe | P2 |

**Criterio de éxito del M2:**
- Desde que el cliente firma hasta que recibe el email: < 5 minutos
- El técnico no escribió ningún texto del informe

---

### M3 — Customers, Sites & Assets (Semana 6–8, paralelo a M2)

**Objetivo:** La base de datos de clientes y activos instalados.

| Feature | Descripción | Prioridad |
|---|---|---|
| CRUD de clientes | Nombre, RUC, industria, contactos | P0 |
| CRUD de sedes/sitios | Dirección, notas de acceso, contacto | P0 |
| CRUD de activos instalados | Equipo, marca, modelo, serie, estado | P0 |
| Tipos de activos con checklist asociado | UPS, estabilizador, AAP, tablero, batería | P0 |
| Vista de activos por sitio | Listado claro y filtrable | P0 |
| Historial de visitas por activo | Órdenes anteriores en el activo | P1 |
| Estado del activo (operacional/degradado/crítico) | Actualizable desde la Work Order | P1 |
| Importación de activos desde CSV | Para clientes con base instalada existente | P2 |

---

### M4 — Tenant Admin básico (Semana 8–9)

**Objetivo:** Una empresa puede crear su cuenta y configurar su workspace.

| Feature | Descripción | Prioridad |
|---|---|---|
| Onboarding de nuevo tenant | Nombre, logo, datos básicos | P0 |
| Gestión de usuarios | Invitar, asignar roles, desactivar | P0 |
| Configuración de tipos de activos | Templates de checklist por equipo | P1 |
| Configuración de plantilla de informe | Logo, colores básicos | P1 |

---

## V1 — "La Operación Completa"
**Foco:** Dar al supervisor y al equipo operativo visibilidad total y herramientas de gestión.
**Criterio de éxito:** Un supervisor puede gestionar todo el ciclo de servicio sin salir de Voltaryx.

### Módulos V1

#### Findings & Recommendations (con AI)
- Hallazgos estructurados desde la Work Order
- Clasificación de criticidad asistida por Gemini
- Seguimiento de hallazgos entre visitas (¿se resolvió?)
- Historial de hallazgos por activo
- Flag automático de oportunidad comercial

#### Contracts & Maintenance Plans
- CRUD de contratos de mantenimiento
- Tipos: preventivo, correctivo, mixto
- Visitas programadas vinculadas al contrato
- Dashboard de vencimientos con alertas
- Cumplimiento de frecuencia de visitas

#### Supervisor Dashboard
- Vista de operaciones en tiempo real
- Mapa de técnicos activos (si hay GPS habilitado)
- Órdenes del día: pendientes, en curso, completadas
- Alertas de hallazgos críticos
- Métricas básicas: órdenes cerradas, tiempo promedio

#### Notificaciones push
- Al técnico: nueva orden asignada
- Al supervisor: orden completada, hallazgo crítico
- Al comercial: nueva oportunidad generada

---

## V2 — "El Motor Comercial"
**Foco:** Convertir la operación técnica en pipeline comercial.

### Módulos V2

#### Sales Handoff / Opportunity Module
- Conversión de hallazgos en oportunidades con un tap
- Vista de oportunidades para el equipo comercial
- Contexto técnico completo: fotos, mediciones, activo afectado
- Integración con CRM externo (Pipedrive, HubSpot) vía n8n

#### Analytics & Productivity (completo)
- KPIs por técnico: tiempo de visita, calidad de checklists, hallazgos
- KPIs por cliente: frecuencia de visitas, hallazgos históricos, contratos activos
- KPIs de negocio: ingresos por tipo de servicio, tasa de conversión comercial
- Exportación de reportes

#### Inventory / Catalog Bridge
- Catálogo de repuestos con número de parte
- Registro de repuestos usados en órdenes
- Stock por técnico (para técnicos con inventario propio)
- Trazabilidad de series instaladas

#### AI Enablement avanzado
- Redacción asistida de hallazgos desde notas de voz
- Clasificación automática de tipo de falla desde descripción
- Predicción de reemplazo de equipo (basado en edad + historial de fallas)
- Análisis de fotos para detección de condiciones evidentes

---

## Quick Wins (alto impacto, bajo esfuerzo)

Estos se implementan dentro de las fases de MVP o V1 cuando haya capacidad:

| Quick Win | Impacto | Esfuerzo | Fase sugerida |
|---|---|---|---|
| Modo oscuro por defecto (ya en DESIGN.md) | Alto (UX) | Bajo | M0 |
| Auto-completar firma desde nombre del contacto | Medio | Muy bajo | M1 |
| Indicador "última visita hace X días" en la orden | Alto (contexto técnico) | Bajo | M1 |
| Notificación de orden asignada | Alto (técnico) | Bajo | M1 |
| Preview PDF antes de enviar | Alto (supervisor) | Medio | M2 |
| Copiar informe al portapapeles como texto | Medio | Muy bajo | M2 |
| Atajos de teclado en web para supervisores | Medio | Bajo | V1 |
| Búsqueda global (clientes, órdenes, activos) | Alto | Medio | V1 |
| Dark / light mode toggle | Bajo | Bajo | V1 |

---

## High Leverage Features (cambio de categoría del producto)

Estas features, cuando lleguen, elevan Voltaryx a otra categoría:

| Feature | Por qué es high leverage |
|---|---|
| **Informe con IA en 30 segundos** | De "informe rápido" a "informe instantáneo y redactado" — diferenciador brutal |
| **Scanner de QR/código de barras para activos** | Técnico escanea el equipo y Voltaryx muestra todo el historial en 2 segundos |
| **Timeline visual del historial del activo** | El técnico ve de un vistazo toda la vida del equipo antes de empezar |
| **Portal del cliente** | El cliente ve sus equipos, historial y próximas visitas — retención y percepción premium |
| **App nativa (React Native)** | Acceso a cámara nativa, sensores, push notifications reales — experiencia técnico next level |
| **Predicción de fallas** | AI que indica qué equipos probablemente fallen basado en historial y parámetros |

---

## Deuda técnica

### Deuda técnica aceptable

| Ítem | Razón de aceptar | Cuándo limpiar |
|---|---|---|
| Texto libre para repuestos en MVP | Catálogo completo es scope de V2 | Cuando se implemente Inventory |
| Un solo idioma (español) en MVP | Localización es scope futuro | Si hay expansión internacional |
| Sin tests E2E en MVP | Velocidad de construcción inicial | Antes de V1 en producción |
| Plantilla de informe fija en MVP | Customización es scope de V1 | Al implementar Tenant Admin completo |
| Sin rate limiting en API | Escala pequeña en MVP | Antes de apertura pública |

### Deuda técnica NO aceptable (nunca)

| Ítem | Razón |
|---|---|
| Desactivar RLS en cualquier tabla | Seguridad. Sin excepciones. |
| `tenant_id` sin index en tablas grandes | Performance degradará con escala |
| Secrets en el repositorio | Riesgo de seguridad crítico |
| Componentes sin tipado TypeScript (any) | Rompe la seguridad de tipos del sistema |
| Fotos sin compresión antes de subir | Costo de Storage y performance del informe |
| Work Orders sin estado de sync en offline | El técnico pierde datos |
| Commits directos a main sin review | Calidad del código |

---

## Criterios de "listo para producción" por fase

### MVP listo cuando:
- [ ] Un técnico externo (no del equipo) puede completar una Work Order sin instrucciones
- [ ] La app funciona offline durante 4 horas y sincroniza correctamente al reconectar
- [ ] El informe PDF es enviado automáticamente en < 5 minutos tras cerrar la orden
- [ ] No hay errores de RLS: un técnico no puede ver datos de otro tenant
- [ ] La app funciona en iPhone SE (375px) y Android mid-range
- [ ] LCP < 2.5s en 3G lento
- [ ] El Orchestrator y QA Agent han revisado y aprobado cada módulo

### V1 listo cuando:
- [ ] Un supervisor puede gestionar el día operativo completo sin papel
- [ ] Los contratos generan alertas de vencimiento automáticamente
- [ ] Los hallazgos críticos notifican al supervisor en < 1 minuto
- [ ] Al menos 2 tenants reales están usando el sistema en producción
- [ ] NPS de técnicos > 40

### V2 listo cuando:
- [ ] Al menos 1 oportunidad comercial se ha convertido en cotización gracias a Voltaryx
- [ ] El equipo comercial usa el módulo de oportunidades activamente
- [ ] Analytics muestran reducción real en tiempo de documentación
